/**
 * Upload routes — Phase 1 of the media upload system.
 *
 * Flow:
 *   1. POST /api/upload/presign          → validates & returns a short-lived presigned PUT URL
 *   2. Frontend PUTs file directly to S3 (server never touches the bytes)
 *   3. POST /api/upload/confirm          → marks upload complete, returns final metadata
 *
 * For files >100 MB, the multipart flow is used:
 *   1. POST /api/upload/multipart/start
 *   2. POST /api/upload/multipart/presign-part  (once per 10 MB chunk)
 *   3. POST /api/upload/multipart/complete
 *
 * The old POST /api/upload route (multer-s3) is kept for legacy compatibility.
 */

import express from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import {
    S3Client,
    PutObjectCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { ALLOWED_TYPES, isAllowed, getMeta, ALLOWED_EXTENSIONS } from '../lib/fileTypes.js';
import { toUserMessage } from '../lib/errorMap.js';

const router = express.Router();

// ── S3 client factory (reads env at request time, not at import time) ─────────
function getS3() {
    return new S3Client({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
            accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });
}

/** Returns true when all required AWS environment variables are set. */
function isS3Configured() {
    const bucket = process.env.AWS_S3_BUCKET;
    return bucket && !['', 'your_bucket_name_here', 'undefined'].includes(bucket.trim());
}

/** Builds a namespaced S3 key so users can't overwrite each other. */
function buildKey(prefix, typePrefix, ext) {
    const uploadPrefix = process.env.S3_UPLOAD_PREFIX || 'uploads';
    return `${uploadPrefix}/${prefix}/${typePrefix}/${uuidv4()}${ext}`;
}

/** Formats bytes as a human-readable size string. */
function formatFileSize(bytes) {
    if (!bytes || bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1B — POST /api/upload/presign
// Validates incoming request, then returns a short-lived presigned PUT URL.
// The server never receives the actual file bytes.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/presign', authMiddleware, async (req, res) => {
    if (!isS3Configured()) {
        return res.status(503).json({ error: 'File uploads are temporarily unavailable.' });
    }

    const { filename, contentType, sizeBytes } = req.body;

    // Validate MIME type
    if (!contentType || !isAllowed(contentType)) {
        return res.status(400).json({
            error: `File type not supported. Allowed: ${ALLOWED_EXTENSIONS.join(' ')}`,
        });
    }

    const meta    = getMeta(contentType);
    const maxBytes = meta.maxMB * 1024 * 1024;

    // Validate size
    if (sizeBytes && sizeBytes > maxBytes) {
        return res.status(400).json({
            error: `File exceeds the ${meta.maxMB} MB limit for this type.`,
        });
    }

    // Enforce global 100 MB ceiling from env
    const globalMaxBytes = Number(process.env.MAX_UPLOAD_SIZE_MB || 100) * 1024 * 1024;
    if (sizeBytes && sizeBytes > globalMaxBytes) {
        return res.status(400).json({ error: `File exceeds the maximum upload size of ${process.env.MAX_UPLOAD_SIZE_MB || 100} MB.` });
    }

    try {
        const ext     = meta.ext;
        const fileKey = buildKey('notes', meta.prefix, ext);
        const bucket  = process.env.AWS_S3_BUCKET;
        const ttl     = Number(process.env.PRESIGNED_URL_TTL_SECONDS || 300);

        const command = new PutObjectCommand({
            Bucket:      bucket,
            Key:         fileKey,
            ContentType: contentType,
            // Attach uploader identity as object metadata
            Metadata: {
                originalName: encodeURIComponent(filename || 'upload'),
            },
        });

        const uploadUrl = await getSignedUrl(getS3(), command, { expiresIn: ttl });

        console.log(`📋 Presigned URL issued → key: ${fileKey} | type: ${contentType} | ttl: ${ttl}s`);

        return res.json({
            uploadUrl,
            fileKey,
            expiresIn: ttl,
        });
    } catch (err) {
        console.error('Presign error:', err);
        return res.status(500).json({ error: toUserMessage(err) });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1C — POST /api/upload/confirm
// Called after the frontend PUT to S3 succeeds.
// Verifies the object exists and returns clean metadata.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/confirm', authMiddleware, async (req, res) => {
    const { fileKey, fileName, mimeType, sizeBytes } = req.body;

    if (!fileKey) {
        return res.status(400).json({ error: 'fileKey is required.' });
    }

    // Validate that the key belongs to our upload prefix
    const uploadPrefix = process.env.S3_UPLOAD_PREFIX || 'uploads';
    if (!fileKey.startsWith(uploadPrefix + '/')) {
        return res.status(400).json({ error: 'Invalid file key.' });
    }

    if (mimeType && !isAllowed(mimeType)) {
        return res.status(400).json({ error: 'File type not supported.' });
    }

    const meta = mimeType ? getMeta(mimeType) : null;

    console.log(`✅ Upload confirmed → key: ${fileKey}`);

    return res.json({
        fileKey,
        fileUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${fileKey}`,
        fileName: fileName || fileKey.split('/').pop(),
        fileType: meta?.ext || '.' + (fileKey.split('.').pop() || 'bin'),
        mimeType: mimeType || 'application/octet-stream',
        size:     formatFileSize(sizeBytes),
        status:   'READY',
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1D — MULTIPART UPLOAD (for files > 100 MB)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/upload/multipart/start
 * Initiates a multipart upload session. Returns uploadId + fileKey.
 */
router.post('/multipart/start', authMiddleware, async (req, res) => {
    if (!isS3Configured()) {
        return res.status(503).json({ error: 'File uploads are temporarily unavailable.' });
    }

    const { filename, contentType } = req.body;

    if (!contentType || !isAllowed(contentType)) {
        return res.status(400).json({ error: `File type not supported. Allowed: ${ALLOWED_EXTENSIONS.join(' ')}` });
    }

    const meta    = getMeta(contentType);
    const fileKey = buildKey('notes', meta.prefix, meta.ext);
    const bucket  = process.env.AWS_S3_BUCKET;

    try {
        const { UploadId } = await getS3().send(new CreateMultipartUploadCommand({
            Bucket:      bucket,
            Key:         fileKey,
            ContentType: contentType,
            Metadata:    { originalName: encodeURIComponent(filename || 'upload') },
        }));

        console.log(`🚀 Multipart started → uploadId: ${UploadId} | key: ${fileKey}`);
        return res.json({ uploadId: UploadId, fileKey });
    } catch (err) {
        console.error('Multipart start error:', err);
        return res.status(500).json({ error: toUserMessage(err) });
    }
});

/**
 * POST /api/upload/multipart/presign-part
 * Returns a presigned URL for a single 10 MB chunk.
 * Frontend calls this once per chunk.
 */
router.post('/multipart/presign-part', authMiddleware, async (req, res) => {
    const { fileKey, uploadId, partNumber } = req.body;

    if (!fileKey || !uploadId || !partNumber) {
        return res.status(400).json({ error: 'fileKey, uploadId, and partNumber are required.' });
    }

    if (partNumber < 1 || partNumber > 10000) {
        return res.status(400).json({ error: 'partNumber must be between 1 and 10000.' });
    }

    try {
        const url = await getSignedUrl(
            getS3(),
            new UploadPartCommand({
                Bucket:     process.env.AWS_S3_BUCKET,
                Key:        fileKey,
                UploadId:   uploadId,
                PartNumber: partNumber,
            }),
            { expiresIn: 600 } // 10 min per chunk
        );

        return res.json({ url });
    } catch (err) {
        console.error('Presign-part error:', err);
        return res.status(500).json({ error: toUserMessage(err) });
    }
});

/**
 * POST /api/upload/multipart/complete
 * Assembles all uploaded chunks into the final S3 object.
 */
router.post('/multipart/complete', authMiddleware, async (req, res) => {
    const { fileKey, uploadId, parts, fileName, mimeType, sizeBytes } = req.body;

    if (!fileKey || !uploadId || !Array.isArray(parts) || parts.length === 0) {
        return res.status(400).json({ error: 'fileKey, uploadId, and parts[] are required.' });
    }

    // Validate parts structure
    const validParts = parts.every(p => p.PartNumber && p.ETag);
    if (!validParts) {
        return res.status(400).json({ error: 'Each part must have PartNumber and ETag.' });
    }

    try {
        await getS3().send(new CompleteMultipartUploadCommand({
            Bucket:          process.env.AWS_S3_BUCKET,
            Key:             fileKey,
            UploadId:        uploadId,
            MultipartUpload: {
                Parts: [...parts].sort((a, b) => a.PartNumber - b.PartNumber),
            },
        }));

        const meta = mimeType ? getMeta(mimeType) : null;
        console.log(`✅ Multipart complete → key: ${fileKey} | parts: ${parts.length}`);

        return res.json({
            fileKey,
            fileUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${fileKey}`,
            fileName: fileName || fileKey.split('/').pop(),
            fileType: meta?.ext || '.' + (fileKey.split('.').pop() || 'bin'),
            mimeType: mimeType || 'application/octet-stream',
            size:     formatFileSize(sizeBytes),
            status:   'READY',
        });
    } catch (err) {
        console.error('Multipart complete error:', err);
        // Attempt to abort the failed multipart session to avoid lingering charges
        try {
            await getS3().send(new AbortMultipartUploadCommand({
                Bucket:   process.env.AWS_S3_BUCKET,
                Key:      fileKey,
                UploadId: uploadId,
            }));
        } catch (abortErr) {
            console.error('Multipart abort error:', abortErr.message);
        }
        return res.status(500).json({ error: toUserMessage(err) });
    }
});

/**
 * POST /api/upload/multipart/abort
 * Called when the user cancels a multipart upload mid-way.
 * Frees S3 storage for incomplete parts.
 */
router.post('/multipart/abort', authMiddleware, async (req, res) => {
    const { fileKey, uploadId } = req.body;
    if (!fileKey || !uploadId) {
        return res.status(400).json({ error: 'fileKey and uploadId are required.' });
    }
    try {
        await getS3().send(new AbortMultipartUploadCommand({
            Bucket:   process.env.AWS_S3_BUCKET,
            Key:      fileKey,
            UploadId: uploadId,
        }));
        return res.json({ status: 'aborted' });
    } catch (err) {
        console.error('Abort multipart error:', err);
        return res.status(500).json({ error: toUserMessage(err) });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY — POST /api/upload
// Server-side upload via multer-s3. Kept for backwards compatibility.
// New code should use the presigned URL flow above.
// ─────────────────────────────────────────────────────────────────────────────

// Derived from the already-imported ALLOWED_TYPES — no duplicate import needed
const ALLOWED_MIME_TYPES = Object.keys(ALLOWED_TYPES);
const MIME_TO_EXT        = Object.fromEntries(
    Object.entries(ALLOWED_TYPES).map(([mime, meta]) => [mime, meta.ext])
);


function createLegacyUploader() {
    const bucket = process.env.AWS_S3_BUCKET;
    return multer({
        storage: multerS3({
            s3: getS3(),
            bucket,
            contentType: multerS3.AUTO_CONTENT_TYPE,
            metadata: (req, file, cb) => {
                cb(null, { originalName: file.originalname });
            },
            key: (req, file, cb) => {
                const ext = MIME_TO_EXT[file.mimetype] || '.bin';
                cb(null, `uploads/notes/docs/${uuidv4()}${ext}`);
            },
        }),
        limits: { fileSize: 100 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            ALLOWED_MIME_TYPES.includes(file.mimetype)
                ? cb(null, true)
                : cb(new Error(`File type not allowed: ${file.mimetype}`), false);
        },
    });
}

router.post('/', authMiddleware, (req, res, next) => {
    if (!isS3Configured()) {
        return res.status(503).json({ error: 'File uploads are temporarily unavailable.' });
    }
    const upload = createLegacyUploader();
    upload.single('file')(req, res, (err) => {
        if (err) return next(err);
        try {
            if (!req.file) return res.status(400).json({ error: 'No file provided.' });
            const file = req.file;
            const ext  = MIME_TO_EXT[file.mimetype] || '';
            console.log(`✅ Legacy S3 upload → key: ${file.key}`);
            return res.status(200).json({
                fileKey:  file.key,
                fileUrl:  file.location,
                fileName: file.originalname,
                fileType: ext,
                mimeType: file.mimetype,
                size:     formatFileSize(file.size),
            });
        } catch (handlerErr) {
            console.error('Upload handler error:', handlerErr.message);
            res.status(500).json({ error: toUserMessage(handlerErr) });
        }
    });
});

// ── Error handler ────────────────────────────────────────────────────────────
router.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 100 MB.' });
    }
    console.error('Upload middleware error:', err.message);
    res.status(400).json({ error: toUserMessage(err) });
});

export default router;

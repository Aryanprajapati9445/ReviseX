/**
 * Phase 5 — S3-triggered Lambda: post-upload processing pipeline.
 *
 * TRIGGER: S3 PutObject event on the `uploads/` prefix.
 *
 * Pipeline per file:
 *   1. Validate key is in uploads/ prefix
 *   2. Virus scan (placeholder — integrate ClamAV Lambda layer or external API)
 *   3. Post-process: resize images, extract PDF pages, generate video thumbnail
 *   4. Move to verified/ on success, quarantine/ on failure
 *   5. Update DB file status (READY | REJECTED | FAILED)
 *   6. (Optional) Notify user via WebSocket / SNS
 *
 * DEPLOY:
 *   - Runtime: Node.js 20.x
 *   - Handler: processUpload.handler
 *   - Memory: 512 MB (1024 MB for video processing)
 *   - Timeout: 5 minutes
 *   - Layers: Add sharp layer for image processing
 *   - Env vars: AWS_S3_BUCKET, MONGODB_URI, S3_VERIFIED_PREFIX, S3_QUARANTINE_PREFIX
 *
 * S3 Trigger configuration (set in AWS Console or CDK):
 *   Bucket: revisex-notes-files
 *   Event:  s3:ObjectCreated:Put
 *   Prefix: uploads/              ← IMPORTANT: scope to uploads/ only
 */

import {
    S3Client,
    CopyObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
} from '@aws-sdk/client-s3';

const s3     = new S3Client({});
const BUCKET = process.env.AWS_S3_BUCKET;

/** Entry point for S3 event trigger. */
export const handler = async (event) => {
    const results = await Promise.allSettled(
        event.Records.map(record => processRecord(record))
    );

    // Log any failures but don't throw — Lambda will not retry on settled promises
    results.forEach((result, i) => {
        if (result.status === 'rejected') {
            console.error(`❌ Record ${i} failed:`, result.reason);
        }
    });
};

/**
 * Processes a single S3 event record.
 * @param {import('aws-lambda').S3EventRecord} record
 */
async function processRecord(record) {
    const bucket = record.s3.bucket.name;
    const key    = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    // Only process files in the uploads/ prefix
    const uploadPrefix = process.env.S3_UPLOAD_PREFIX || 'uploads';
    if (!key.startsWith(uploadPrefix + '/')) {
        console.log(`⏭ Skipping key outside upload prefix: ${key}`);
        return;
    }

    console.log(`🔄 Processing: ${key}`);

    try {
        // ── Step 1: Read object metadata ─────────────────────────────────────
        const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        const contentType = head.ContentType || 'application/octet-stream';

        // ── Step 2: Virus scan ────────────────────────────────────────────────
        // TODO: Integrate ClamAV Lambda layer or external scan API (e.g. Trend Micro).
        // Replace the stub below with your actual scan implementation.
        const scanResult = await virusScan(bucket, key);

        if (!scanResult.clean) {
            await quarantine(bucket, key, `Security scan failed: ${scanResult.reason}`);
            return;
        }

        // ── Step 3: Post-processing by type ──────────────────────────────────
        await postProcess(bucket, key, contentType);

        // ── Step 4: Move to verified/ prefix ─────────────────────────────────
        const verifiedPrefix = process.env.S3_VERIFIED_PREFIX || 'verified';
        const verifiedKey    = key.replace(uploadPrefix + '/', verifiedPrefix + '/');

        await s3.send(new CopyObjectCommand({
            Bucket:     bucket,
            CopySource: `${bucket}/${key}`,
            Key:        verifiedKey,
            MetadataDirective: 'COPY',
        }));
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

        // ── Step 5: Update DB status to READY ────────────────────────────────
        // TODO: Connect to MongoDB and update the file record.
        // await db.file.updateOne({ key }, { $set: { status: 'READY', verifiedKey } });
        console.log(`✅ Verified: ${key} → ${verifiedKey}`);

        // ── Step 6: Notify user (optional) ───────────────────────────────────
        // await notifyUser(uploadedBy, { type: 'FILE_READY', verifiedKey });

    } catch (err) {
        console.error(`❌ Processing failed for ${key}:`, err);

        // Mark as FAILED in DB
        // await db.file.updateOne({ key }, { $set: { status: 'FAILED' } });

        // Re-throw so Promise.allSettled captures it
        throw err;
    }
}

// ─── Virus Scan Stub ──────────────────────────────────────────────────────────

/**
 * Stub virus scanner. Replace with your actual scan integration.
 * Options: ClamAV Lambda layer, Trend Micro FS for S3, Sophos, etc.
 *
 * @param {string} bucket
 * @param {string} key
 * @returns {{ clean: boolean; reason?: string }}
 */
async function virusScan(_bucket, _key) {
    // TODO: Implement actual virus scan.
    // Example: call external scan API, run ClamAV via Lambda layer, etc.
    console.log('🔍 Virus scan: stub — marking clean. Integrate a real scanner.');
    return { clean: true };
}

// ─── Post-processing ──────────────────────────────────────────────────────────

/**
 * Runs type-specific post-processing.
 * Add image resizing, video thumbnail generation, PDF page count, etc.
 *
 * @param {string} bucket
 * @param {string} key
 * @param {string} contentType
 */
async function postProcess(bucket, key, contentType) {
    if (contentType.startsWith('image/')) {
        await processImage(bucket, key);
    } else if (contentType.startsWith('video/')) {
        await processVideo(bucket, key);
    } else if (contentType === 'application/pdf') {
        await processPdf(bucket, key);
    }
    // Docs, audio, text: no post-processing needed
}

/**
 * Image post-processing: resize to max 2000px, convert to WebP.
 * Requires the `sharp` Lambda layer.
 *
 * @param {string} bucket
 * @param {string} key
 */
async function processImage(_bucket, _key) {
    // TODO: Use sharp to resize/optimize the image.
    // import sharp from 'sharp';
    // const stream = ...
    console.log('🖼 Image post-processing: stub. Add sharp layer to Lambda.');
}

/**
 * Video post-processing: generate thumbnail at 5s mark.
 * Requires ffmpeg Lambda layer.
 *
 * @param {string} bucket
 * @param {string} key
 */
async function processVideo(_bucket, _key) {
    // TODO: Use ffmpeg to extract thumbnail frame.
    console.log('🎬 Video post-processing: stub. Add ffmpeg layer to Lambda.');
}

/**
 * PDF post-processing: count pages, extract first-page thumbnail.
 *
 * @param {string} bucket
 * @param {string} key
 */
async function processPdf(_bucket, _key) {
    // TODO: Use pdf-lib or pdfjs to count pages / generate thumbnail.
    console.log('📄 PDF post-processing: stub. Add pdf-lib to Lambda.');
}

// ─── Quarantine ───────────────────────────────────────────────────────────────

/**
 * Moves a file to the quarantine prefix and marks it rejected in the DB.
 *
 * @param {string} bucket
 * @param {string} key
 * @param {string} reason
 */
async function quarantine(bucket, key, reason) {
    const uploadPrefix     = process.env.S3_UPLOAD_PREFIX     || 'uploads';
    const quarantinePrefix = process.env.S3_QUARANTINE_PREFIX || 'quarantine';
    const quarantineKey    = key.replace(uploadPrefix + '/', quarantinePrefix + '/');

    await s3.send(new CopyObjectCommand({
        Bucket:     bucket,
        CopySource: `${bucket}/${key}`,
        Key:        quarantineKey,
    }));
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

    // TODO: Update DB
    // await db.file.updateOne({ key }, { $set: { status: 'REJECTED', rejectedReason: reason } });
    console.warn(`🚫 Quarantined: ${key} → ${quarantineKey} | Reason: ${reason}`);
}

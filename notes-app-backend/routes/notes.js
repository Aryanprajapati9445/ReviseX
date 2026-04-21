import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import Note from '../models/Note.js';
import s3Client from '../config/s3.js';
import { authMiddleware, studentAuthMiddleware } from '../middleware/authMiddleware.js';
import { toUserMessage } from '../lib/errorMap.js';
import { getSignedReadUrl, isCloudFrontConfigured } from '../lib/cloudfront.js';


/** Read TTL: signed URL valid for 15 minutes (900s). Increase via SIGNED_URL_READ_TTL_SECONDS. */
const READ_TTL = Number(process.env.SIGNED_URL_READ_TTL_SECONDS || 900);

const router = express.Router();

// ── GET /api/notes ── Get all notes (Public) ──────────────────────────
router.get('/', async (req, res) => {
    try {
        const notes = await Note.find().sort({ date: -1 });
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ── GET /api/notes/subject/:subject ── Filter by subject (Public) ─────
router.get('/subject/:subject', async (req, res) => {
    try {
        const notes = await Note.find({ section: req.params.subject }).sort({ date: -1 });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── GET /api/notes/exam/:examType ── Filter by exam type (Public) ─────
router.get('/exam/:examType', async (req, res) => {
    try {
        const notes = await Note.find({ examType: req.params.examType }).sort({ date: -1 });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── GET /api/notes/:id/download-url ── Signed read URL (Phase 2A/2B) ────────
// ?dl=1 → download attachment   (default: inline view)
// Uses CloudFront signed URL if CLOUDFRONT_DOMAIN is set; falls back to S3.
router.get('/:id/download-url', async (req, res) => {
    try {
        const note = await Note.findOne({ id: req.params.id });
        if (!note) return res.status(404).json({ error: 'File not found.' });

        // Legacy notes stored as base64 / raw content
        if (!note.fileKey) {
            return res.json({ url: note.content || null, isLegacy: true });
        }

        if (!process.env.AWS_S3_BUCKET) {
            return res.status(503).json({ error: 'File storage is not available.' });
        }

        const isDownload = req.query.dl === '1';
        const url = await getSignedReadUrl(note.fileKey, {
            mimeType: note.mimeType,
            fileName: note.fileName,
            download: isDownload,
            ttl:      READ_TTL,
        });

        if (isDownload) {
            // Fire-and-forget — don't block the URL response
            Note.findOneAndUpdate({ id: req.params.id }, { $inc: { downloads: 1 } }).catch(() => {});
        }

        return res.json({
            url,
            fileName:  note.fileName,
            mimeType:  note.mimeType,
            sizeBytes: note.sizeBytes,
            expiresIn: READ_TTL,
            via:       isCloudFrontConfigured() ? 'cloudfront' : 's3',
        });
    } catch (error) {
        console.error('Signed URL error:', error.message);
        return res.status(500).json({ error: toUserMessage(error) });
    }
});


// ── GET /api/notes/:id ── Get single note (Public) ────────────────────
router.get('/:id', async (req, res) => {
    try {
        const note = await Note.findOne({ id: req.params.id });
        if (!note) return res.status(404).json({ error: 'Note not found' });
        res.json(note);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── POST /api/notes ── Create note (Admin only) ───────────────────────
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            title, section, examType, description,
            fileUrl, fileKey, fileName, fileType, mimeType,
            pages, size, uploader, author, email, tags,
            content,
        } = req.body;

        const note = new Note({
            id: `note_${uuidv4()}`,   // UUID — unpredictable, non-enumerable
            title,
            section,
            examType,
            description,
            fileUrl,
            fileKey,
            fileName,
            fileType,
            mimeType,
            content: content || '',
            pages: parseInt(pages) || 0,
            size: size || '—',
            uploader: uploader || 'Admin',
            author,
            email,
            tags: tags || [],
            date: new Date(),
        });

        const savedNote = await note.save();
        res.status(201).json(savedNote);
    } catch (error) {
        res.status(400).json({ error: toUserMessage(error) });
    }
});

// ── PUT /api/notes/:id ── Update note metadata (Admin only) ──────────
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { title, section, examType, description, pages, size, uploader, tags } = req.body;

        const note = await Note.findOneAndUpdate(
            { id: req.params.id },
            { title, section, examType, description, pages, size, uploader, tags, updatedAt: Date.now() },
            { new: true }
        );

        if (!note) return res.status(404).json({ error: 'Note not found' });
        res.json(note);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ── DELETE /api/notes/:id ── Delete note + S3 file (Admin only) ───────
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const note = await Note.findOneAndDelete({ id: req.params.id });
        if (!note) return res.status(404).json({ error: 'Note not found' });

        const bucketName = process.env.AWS_S3_BUCKET;
        if (note.fileKey && bucketName) {
            try {
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: note.fileKey,
                }));
                console.log(`🗑️  Deleted S3 object: ${note.fileKey}`);
            } catch (s3Err) {
                console.error('Warning: S3 delete failed:', s3Err.message);
            }
        }

        res.json({ message: 'Note deleted' });
    } catch (error) {
        res.status(500).json({ error: toUserMessage(error) });
    }
});

// ── POST /api/notes/:id/like ── Toggle like (Requires student JWT) ────
// Email is read from the verified JWT — not from the request body.
// This prevents anyone from liking as an arbitrary email address.
router.post('/:id/like', studentAuthMiddleware, async (req, res) => {
    try {
        const email = req.student.email; // sourced from the signed JWT — trusted

        const note = await Note.findOne({ id: req.params.id });
        if (!note) return res.status(404).json({ error: 'Note not found' });

        if (note.likes.includes(email)) {
            note.likes = note.likes.filter(e => e !== email);
        } else {
            note.likes.push(email);
        }

        const updated = await note.save();
        res.json({ likes: updated.likes.length, liked: updated.likes.includes(email) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── POST /api/notes/:id/download ── Increment downloads (legacy) ──────
router.post('/:id/download', async (req, res) => {
    try {
        const note = await Note.findOneAndUpdate(
            { id: req.params.id },
            { $inc: { downloads: 1 } },
            { new: true }
        );
        if (!note) return res.status(404).json({ error: 'Note not found' });
        res.json({ downloads: note.downloads });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

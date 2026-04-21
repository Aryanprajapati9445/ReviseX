import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Subject from '../models/Subject.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── GET /api/subjects ── Public ───────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const subjects = await Subject.find();
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ── GET /api/subjects/branch/:branch ── Public ────────────────────────
router.get('/branch/:branch', async (req, res) => {
    try {
        const subjects = await Subject.find({ branch: req.params.branch });
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── GET /api/subjects/:id ── Public ──────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const subject = await Subject.findOne({ id: req.params.id });
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        res.json(subject);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── POST /api/subjects ── Admin only ──────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, description, branch, semester, color, icon } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Subject name is required.' });
        }

        const subject = new Subject({
            id: `subject_${uuidv4()}`,  // UUID — unpredictable, non-enumerable
            name,
            description,
            branch,
            semester,
            color,
            icon,
        });

        const savedSubject = await subject.save();
        res.status(201).json(savedSubject);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ── PUT /api/subjects/:id ── Admin only ───────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { name, description, branch, semester, color, icon } = req.body;

        const subject = await Subject.findOneAndUpdate(
            { id: req.params.id },
            { name, description, branch, semester, color, icon },
            { new: true }
        );

        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        res.json(subject);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ── DELETE /api/subjects/:id ── Admin only ────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const subject = await Subject.findOneAndDelete({ id: req.params.id });
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        res.json({ message: 'Subject deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

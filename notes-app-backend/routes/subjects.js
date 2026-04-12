import express from 'express';
import Subject from '../models/Subject.js';

const router = express.Router();

// GET all subjects
router.get('/', async (req, res) => {
    try {
        const subjects = await Subject.find();
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET subjects by branch
router.get('/branch/:branch', async (req, res) => {
    try {
        const subjects = await Subject.find({ branch: req.params.branch });
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET single subject
router.get('/:id', async (req, res) => {
    try {
        const subject = await Subject.findOne({ id: req.params.id });
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        res.json(subject);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CREATE new subject
router.post('/', async (req, res) => {
    try {
        const { name, description, branch, semester, color, icon } = req.body;

        const subject = new Subject({
            id: `subject_${Date.now()}`,
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

// UPDATE subject
router.put('/:id', async (req, res) => {
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

// DELETE subject
router.delete('/:id', async (req, res) => {
    try {
        const subject = await Subject.findOneAndDelete({ id: req.params.id });
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        res.json({ message: 'Subject deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

import express from 'express';
import Note from '../models/Note.js';

const router = express.Router();

// GET all notes
router.get('/', async (req, res) => {
    try {
        const notes = await Note.find().sort({ date: -1 });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET notes by subject (section)
router.get('/subject/:subject', async (req, res) => {
    try {
        const notes = await Note.find({ section: req.params.subject }).sort({ date: -1 });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET notes by exam type
router.get('/exam/:examType', async (req, res) => {
    try {
        const notes = await Note.find({ examType: req.params.examType }).sort({ date: -1 });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET single note
router.get('/:id', async (req, res) => {
    try {
        const note = await Note.findOne({ id: req.params.id });
        if (!note) return res.status(404).json({ error: 'Note not found' });
        res.json(note);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CREATE new note
router.post('/', async (req, res) => {
    try {
        const { title, section, examType, description, content, fileName, fileType, pages, size, uploader, author, email, tags } = req.body;

        const note = new Note({
            id: `note_${Date.now()}`,
            title,
            section,
            examType,
            description,
            content,
            fileName,
            fileType,
            pages,
            size,
            uploader,
            author,
            email,
            tags: tags || [],
            date: new Date(),
        });

        const savedNote = await note.save();
        res.status(201).json(savedNote);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// UPDATE note
router.put('/:id', async (req, res) => {
    try {
        const { title, section, examType, description, content, fileName, fileType, pages, size, uploader, tags } = req.body;

        const note = await Note.findOneAndUpdate(
            { id: req.params.id },
            { title, section, examType, description, content, fileName, fileType, pages, size, uploader, tags, updatedAt: Date.now() },
            { new: true }
        );

        if (!note) return res.status(404).json({ error: 'Note not found' });
        res.json(note);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE note
router.delete('/:id', async (req, res) => {
    try {
        const note = await Note.findOneAndDelete({ id: req.params.id });
        if (!note) return res.status(404).json({ error: 'Note not found' });
        res.json({ message: 'Note deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// LIKE note
router.post('/:id/like', async (req, res) => {
    try {
        const { email } = req.body;
        const note = await Note.findOne({ id: req.params.id });

        if (!note) return res.status(404).json({ error: 'Note not found' });

        if (note.likes.includes(email)) {
            note.likes = note.likes.filter(e => e !== email);
        } else {
            note.likes.push(email);
        }

        const updated = await note.save();
        res.json({ likes: updated.likes.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// INCREMENT downloads
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

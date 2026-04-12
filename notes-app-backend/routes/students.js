import express from 'express';
import Student from '../models/Student.js';

const router = express.Router();

// GET all students
router.get('/', async (req, res) => {
    try {
        const students = await Student.find();
        res.json(students);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET student by email
router.get('/email/:email', async (req, res) => {
    try {
        const student = await Student.findOne({ email: req.params.email });
        if (!student) return res.status(404).json({ error: 'Student not found' });
        res.json(student);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET single student
router.get('/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ error: 'Student not found' });
        res.json(student);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// REGISTER student (Sign Up)
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, firstName, startYear, endYear, branch, branchFull, roll, batch } = req.body;

        let student = await Student.findOne({ email });

        if (student) {
            return res.status(400).json({ error: 'Account already exists. Please login instead.' });
        }

        // Create new student
        student = new Student({
            fullName,
            email,
            password,
            firstName,
            startYear,
            endYear,
            branch,
            branchFull,
            roll,
            batch,
            notes: [],
            likedNotes: [],
        });

        const savedStudent = await student.save();
        res.status(201).json(savedStudent);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// LOGIN student
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const student = await Student.findOne({ email });
        if (!student) {
            return res.status(404).json({ error: 'No account found. Please sign up first.' });
        }
        
        if (student.password !== password) {
            return res.status(401).json({ error: 'Incorrect password. Please try again.' });
        }
        
        res.json(student);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ADD note to student
router.post('/:email/notes', async (req, res) => {
    try {
        const { noteId } = req.body;
        const student = await Student.findOne({ email: req.params.email });

        if (!student) return res.status(404).json({ error: 'Student not found' });

        if (!student.notes.includes(noteId)) {
            student.notes.push(noteId);
            await student.save();
        }

        res.json(student);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// LIKE note
router.post('/:email/like/:noteId', async (req, res) => {
    try {
        const { email } = req.params;
        const { noteId } = req.params;
        const student = await Student.findOne({ email });

        if (!student) return res.status(404).json({ error: 'Student not found' });

        if (student.likedNotes.includes(noteId)) {
            student.likedNotes = student.likedNotes.filter(id => id !== noteId);
        } else {
            student.likedNotes.push(noteId);
        }

        await student.save();
        res.json({ likedNotes: student.likedNotes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE student
router.delete('/:id', async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);
        if (!student) return res.status(404).json({ error: 'Student not found' });
        res.json({ message: 'Student deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

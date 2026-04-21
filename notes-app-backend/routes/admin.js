import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// POST /api/admin/login
router.post('/login', (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Password is required.' });
    }

    const correctPassword = process.env.ADMIN_PASSWORD;
    if (!correctPassword) {
        return res.status(503).json({ error: 'Admin auth is not configured on the server.' });
    }

    if (password !== correctPassword) {
        return res.status(401).json({ error: 'Incorrect password.' });
    }

    const token = jwt.sign(
        { role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    res.json({ token, expiresIn: '8h' });
});

export default router;

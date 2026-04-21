import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';
import OTP from '../models/OTP.js';
import { authMiddleware, studentAuthMiddleware } from '../middleware/authMiddleware.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendOtpEmail } from '../utils/email.js';

const router = express.Router();
const SALT_ROUNDS = 12;

/** Strip sensitive fields before sending a student document to any client. */
function sanitize(student) {
    const obj = student.toObject ? student.toObject() : { ...student };
    delete obj.password;
    delete obj.verificationToken;
    delete obj.verificationExpires;
    delete obj.resetToken;
    delete obj.resetTokenExpires;
    return obj;
}

// ── GET /api/students ── List all students (Admin only) ──────────────
router.get('/', authMiddleware, async (req, res) => {
    try {
        const students = await Student.find().select(
            '-password -verificationToken -verificationExpires -resetToken -resetTokenExpires'
        );
        res.json(students);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── GET /api/students/email/:email ── By email (Admin only) ──────────
router.get('/email/:email', authMiddleware, async (req, res) => {
    try {
        const student = await Student.findOne({ email: req.params.email.toLowerCase() }).select(
            '-password -verificationToken -verificationExpires -resetToken -resetTokenExpires'
        );
        if (!student) return res.status(404).json({ error: 'Student not found' });
        res.json(student);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── GET /api/students/verify/:token ── Verify email ──────────────────
// Must be defined BEFORE /:id to avoid matching 'verify' as an ObjectId
router.get('/verify/:token', async (req, res) => {
    try {
        const student = await Student.findOne({
            verificationToken: req.params.token,
            verificationExpires: { $gt: Date.now() },
        });

        if (!student) {
            return res.status(400).json({
                error: 'Verification link is invalid or has expired. Please register again.',
            });
        }

        student.isVerified = true;
        student.verificationToken = undefined;
        student.verificationExpires = undefined;
        await student.save();

        res.json({ message: 'Email verified successfully! You can now log in.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── GET /api/students/:id ── Single student (Admin only) ─────────────
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const student = await Student.findById(req.params.id).select(
            '-password -verificationToken -verificationExpires -resetToken -resetTokenExpires'
        );
        if (!student) return res.status(404).json({ error: 'Student not found' });
        res.json(student);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── POST /api/students/send-otp ── Request verification code ───────
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required.' });
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }

        const existing = await Student.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ error: 'Account already exists. Please log in instead.' });
        }

        // Generate a 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to DB (upsert so we replace if they request again)
        await OTP.findOneAndUpdate(
            { email: email.toLowerCase() },
            { otp: otpCode },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
        if (smtpConfigured) {
            await sendOtpEmail(email, otpCode);
        } else {
            console.log(`[DEV ONLY] OTP for ${email} is ${otpCode}`);
        }

        res.json({ message: 'Verification code sent successfully.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── POST /api/students/register ── Sign Up ───────────────────────────
router.post('/register', async (req, res) => {
    try {
        const {
            fullName, email, password, firstName,
            startYear, endYear, branch, branchFull, roll, batch, otp
        } = req.body;

        // ── Validation ──
        if (!fullName || !email || !password || !otp) {
            return res.status(400).json({ error: 'fullName, email, password, and OTP are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        const existing = await Student.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ error: 'Account already exists. Please log in instead.' });
        }

        // Verify OTP
        const otpRecord = await OTP.findOne({ email: email.toLowerCase() });
        if (!otpRecord) {
            return res.status(400).json({ error: 'Verification code expired or not requested. Please request a new one.' });
        }
        if (otpRecord.otp !== otp) {
            return res.status(400).json({ error: 'Invalid verification code.' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const student = new Student({
            fullName,
            email: email.toLowerCase(),
            password: hashedPassword,
            firstName,
            startYear,
            endYear,
            branch,
            branchFull,
            roll,
            batch,
            notes: [],
            likedNotes: [],
            isVerified: true, // Auto verified because they proved ownership via OTP
        });

        const savedStudent = await student.save();

        // Delete the OTP record since it's now used
        await OTP.deleteOne({ email: email.toLowerCase() });

        res.status(201).json({ message: 'Registration successful! You can log in now.', student: sanitize(savedStudent) });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ── POST /api/students/login ── Sign In ──────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const student = await Student.findOne({ email: email.toLowerCase() });
        if (!student) {
            return res.status(404).json({ error: 'No account found. Please sign up first.' });
        }

        const match = await bcrypt.compare(password, student.password);
        if (!match) {
            return res.status(401).json({ error: 'Incorrect password. Please try again.' });
        }

        // Block unverified accounts only when SMTP is configured (production)
        const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
        if (smtpConfigured && !student.isVerified) {
            return res.status(403).json({
                error: 'Please verify your email before logging in. Check your inbox.',
                requiresVerification: true,
            });
        }

        // Issue a student JWT (expires in 7 days)
        const token = jwt.sign(
            { role: 'student', email: student.email, studentId: student._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, expiresIn: '7d', student: sanitize(student) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── POST /api/students/forgot-password ── Request password reset ─────
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required.' });

        const student = await Student.findOne({ email: email.toLowerCase() });
        // Always return success to prevent user enumeration
        if (!student) {
            return res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        student.resetToken = resetToken;
        student.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await student.save();

        await sendPasswordResetEmail(email, resetToken);
        res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── POST /api/students/reset-password ── Consume reset token ─────────
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'token and newPassword are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        const student = await Student.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: Date.now() },
        });

        if (!student) {
            return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
        }

        student.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
        student.resetToken = undefined;
        student.resetTokenExpires = undefined;
        await student.save();

        res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── POST /api/students/:email/notes ── Save note to student ──────────
// Requires student JWT — only the logged-in student can modify their own list
router.post('/:email/notes', studentAuthMiddleware, async (req, res) => {
    try {
        // Ensure the token belongs to the same student as the path param
        if (req.student.email !== req.params.email.toLowerCase()) {
            return res.status(403).json({ error: 'Forbidden — you can only modify your own account.' });
        }

        const { noteId } = req.body;
        if (!noteId) return res.status(400).json({ error: 'noteId is required.' });

        const student = await Student.findOne({ email: req.params.email.toLowerCase() });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        if (!student.notes.includes(noteId)) {
            student.notes.push(noteId);
            await student.save();
        }

        res.json({ notes: student.notes });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ── POST /api/students/:email/like/:noteId ── Toggle like ────────────
// Requires student JWT — only the logged-in student can like as themselves
router.post('/:email/like/:noteId', studentAuthMiddleware, async (req, res) => {
    try {
        const { email, noteId } = req.params;

        if (req.student.email !== email.toLowerCase()) {
            return res.status(403).json({ error: 'Forbidden — you can only modify your own account.' });
        }

        const student = await Student.findOne({ email: email.toLowerCase() });
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

// ── DELETE /api/students/:id ── Delete student (Admin only) ──────────
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);
        if (!student) return res.status(404).json({ error: 'Student not found' });
        res.json({ message: 'Student deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

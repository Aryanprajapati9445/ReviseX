import 'dotenv/config';    // ← MUST be first: loads .env before any other module code runs
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import notesRouter from './routes/notes.js';
import subjectsRouter from './routes/subjects.js';
import studentsRouter from './routes/students.js';
import uploadRouter from './routes/upload.js';
import adminRouter from './routes/admin.js';

// ── Startup guards ─────────────────────────────────
if (!process.env.JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET is not set. Refusing to start.');
    process.exit(1);
}
if (!process.env.ADMIN_PASSWORD) {
    console.error('❌ FATAL: ADMIN_PASSWORD is not set. Refusing to start.');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// ── Allowed origins ────────────────────────────────
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
    origin: (origin, cb) => {
        // Allow server-to-server (no origin) or whitelisted origins
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        cb(new Error(`CORS blocked: origin ${origin} not allowed`));
    },
    credentials: true,
}));

// ── Compression ────────────────────────────────────────────────────
// gzip all responses — reduces payload size by ~70%
app.use(compression({ threshold: 1024 })); // only compress responses > 1KB


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Security headers ───────────────────────────────────────────────
app.use((req, res, next) => {
    // Force HTTPS for 1 year in production (ignored by browsers on HTTP)
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    // Prevent MIME-type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Disallow embedding in iframes (clickjacking protection)
    res.setHeader('X-Frame-Options', 'DENY');
    // Limit referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// ── Rate limiting ──────────────────────────────────
// Strict limit on auth endpoints to slow brute-force attacks
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
});

// General API limit
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' },
});

app.use('/api/', apiLimiter);
app.use('/api/admin/login', authLimiter);
app.use('/api/students/login', authLimiter);
app.use('/api/students/register', authLimiter);
app.use('/api/students/forgot-password', authLimiter);
app.use('/api/students/reset-password', authLimiter);

// ── MongoDB ────────────────────────────────────────
connectDB();

// ── Routes ────────────────────────────────────────
app.use('/api/notes', notesRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/upload', uploadRouter);      // authMiddleware applied inside the router

// ── Health check ──────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status: 'Backend is running',
        s3Configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET),
        adminConfigured: !!(process.env.ADMIN_PASSWORD && process.env.JWT_SECRET),
    });
});

// ── Root ──────────────────────────────────────────
app.get('/', (req, res) => {
    res.send('ReviseX API Server');
});

// ── 404 ───────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────
app.use((err, req, res, next) => {
    // Don't leak internal error details in production
    const isDev = process.env.NODE_ENV !== 'production';
    console.error(err);
    res.status(err.status || 500).json({
        error: isDev ? err.message : 'Internal server error',
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📦 S3 Storage: ${process.env.AWS_S3_BUCKET ? `s3://${process.env.AWS_S3_BUCKET}/notes/  (region: ${process.env.AWS_REGION || 'ap-south-1'})` : '⚠️  NOT CONFIGURED'}`);

    console.log(`🔐 Admin auth: ${process.env.ADMIN_PASSWORD ? '✅ Configured' : '⚠️  NOT CONFIGURED'}`);
    console.log(`🌍 Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

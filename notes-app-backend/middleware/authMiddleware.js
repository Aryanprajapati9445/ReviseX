import jwt from 'jsonwebtoken';

// ── Shared helper ─────────────────────────────────────────────────────
function extractToken(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.split(' ')[1];
}

function verifyToken(req, res, next, roleCheck) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized — no token provided.' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (roleCheck && !roleCheck(decoded)) {
            return res.status(403).json({ error: 'Forbidden — insufficient permissions.' });
        }
        return decoded;
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized — invalid or expired token.' });
        return null;
    }
}

// ── Admin middleware ─────────────────────────────────────────────────
// Requires role === 'admin'
export function authMiddleware(req, res, next) {
    const decoded = verifyToken(req, res, next, (d) => d.role === 'admin');
    if (!decoded) return;
    req.admin = decoded;
    next();
}

// ── Student middleware ───────────────────────────────────────────────
// Requires role === 'student'
export function studentAuthMiddleware(req, res, next) {
    const decoded = verifyToken(req, res, next, (d) => d.role === 'student');
    if (!decoded) return;
    req.student = decoded;
    next();
}

// ── Any authenticated user ───────────────────────────────────────────
// Accepts admin OR student token
export function requireAnyAuth(req, res, next) {
    const decoded = verifyToken(req, res, next, (d) => ['admin', 'student'].includes(d.role));
    if (!decoded) return;
    req.authUser = decoded;
    if (decoded.role === 'admin') req.admin = decoded;
    if (decoded.role === 'student') req.student = decoded;
    next();
}

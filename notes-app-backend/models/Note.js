import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
    id: String,
    title: String,
    section: String,
    examType: String,
    description: String,

    // ── File storage (AWS S3) ──
    fileUrl: String,        // Public or presigned URL (stored for reference)
    fileKey: String,        // S3 object key — used for deletion & presigned URLs
    fileName: String,       // Original file name (e.g. "linear_algebra.pdf")
    fileType: String,       // Extension (e.g. ".pdf")
    mimeType: String,       // MIME type (e.g. "application/pdf")

    // ── Legacy / metadata ──
    content: String,        // Kept for backward compat (old text notes)
    pages: Number,
    size: String,
    uploader: String,
    author: String,
    email: String,
    date: { type: Date, default: Date.now },
    tags: [String],
    downloads: { type: Number, default: 0 },
    likes: [String],        // Array of student emails who liked
}, { timestamps: true });

export default mongoose.model('Note', noteSchema);

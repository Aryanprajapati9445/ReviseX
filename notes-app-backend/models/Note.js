import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
    id: String,
    title: String,
    section: String,
    examType: String,
    description: String,
    content: String,
    fileName: String,
    fileType: String,
    pages: Number,
    size: String,
    uploader: String,
    author: String,
    email: String,
    date: { type: Date, default: Date.now },
    tags: [String],
    downloads: { type: Number, default: 0 },
    likes: [String], // Array of student emails who liked
}, { timestamps: true });

export default mongoose.model('Note', noteSchema);

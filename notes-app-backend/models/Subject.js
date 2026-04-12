import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
    id: String,
    name: String,
    description: String,
    branch: String,
    semester: Number,
    color: String,
    icon: String,
}, { timestamps: true });

export default mongoose.model('Subject', subjectSchema);

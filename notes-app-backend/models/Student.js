import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    firstName: String,
    fullName: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    startYear: String,
    endYear: String,
    branch: String,
    branchFull: String,
    roll: String,
    batch: String,
    notes: [String], // References to Note string IDs
    likedNotes: [String], // Array of note IDs liked
}, { timestamps: true });

export default mongoose.model('Student', studentSchema);

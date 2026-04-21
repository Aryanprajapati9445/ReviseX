import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    firstName:    String,
    fullName:     String,
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:     { type: String, required: true },
    startYear:    String,
    endYear:      String,
    branch:       String,
    branchFull:   String,
    roll:         String,
    batch:        String,
    notes:        [String],      // Saved note IDs
    likedNotes:   [String],      // Liked note IDs

    // ── Email verification ──────────────────────────────────────────
    isVerified:          { type: Boolean, default: false },
    verificationToken:   String,
    verificationExpires: Date,

    // ── Password reset ──────────────────────────────────────────────
    resetToken:          String,
    resetTokenExpires:   Date,
}, { timestamps: true });

export default mongoose.model('Student', studentSchema);

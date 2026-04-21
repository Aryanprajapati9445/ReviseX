import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 600 } // Auto-delete after 10 mins (600 seconds)
});

export default mongoose.model('OTP', otpSchema);

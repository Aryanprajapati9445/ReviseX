import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        await mongoose.connect(uri, {
            maxPoolSize: 20,                  // handle up to 20 concurrent DB queries (default: 5)
            serverSelectionTimeoutMS: 5000,   // fail fast if MongoDB is unreachable
            socketTimeoutMS: 45000,           // drop idle sockets after 45s
        });


        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message || error);
        process.exit(1);
    }
};

export default connectDB;

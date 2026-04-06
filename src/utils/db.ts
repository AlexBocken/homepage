import mongoose from 'mongoose';
import { MONGO_URL } from '$env/static/private';

// Use globalThis to persist connection promise across Vite HMR module reloads
const g = globalThis as unknown as { __mongoosePromise?: Promise<typeof mongoose> };

export const dbConnect = async () => {
  // Already connected — return immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Connection in progress — await the existing promise
  if (mongoose.connection.readyState === 2 && g.__mongoosePromise) {
    await g.__mongoosePromise;
    return mongoose.connection;
  }

  try {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    g.__mongoosePromise = mongoose.connect(MONGO_URL ?? '', options);
    await g.__mongoosePromise;

    console.log('MongoDB connected with persistent connection');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    g.__mongoosePromise = undefined;
    throw error;
  }
};

// No longer disconnect - let the connection pool manage connections
export const dbDisconnect = async () => {
  // Keep connections persistent for performance and to avoid race conditions
  // MongoDB driver will handle connection pooling and cleanup automatically
  return;
};

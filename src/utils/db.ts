import mongoose from 'mongoose';
import { MONGO_URL } from '$env/static/private';

let isConnected = false;

export const dbConnect = async () => {
  // If already connected, return immediately
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    // Configure MongoDB driver options
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    const connection = await mongoose.connect(MONGO_URL ?? '', options);
    
    isConnected = true;
    console.log('MongoDB connected with persistent connection');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
      isConnected = true;
    });

    return connection;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    isConnected = false;
    throw error;
  }
};

// No longer disconnect - let the connection pool manage connections
export const dbDisconnect = async () => {
  // Keep connections persistent for performance and to avoid race conditions
  // MongoDB driver will handle connection pooling and cleanup automatically
  return;
};

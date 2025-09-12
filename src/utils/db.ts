import mongoose from 'mongoose';
import { MONGO_URL } from '$env/static/private';
/*
  0 - disconnected
  1 - connected
  2 - connecting
  3 - disconnecting
  4 - uninitialized
*/
const mongoConnection = {
  isConnected: 0,
};

export const dbConnect = async () => {
  if (mongoConnection.isConnected === 1) {
    return;
  }

  if (mongoose.connections.length > 0) {
    mongoConnection.isConnected = mongoose.connections[0].readyState;
    if (mongoConnection.isConnected === 1) {
      return;
    }

    await mongoose.disconnect();
  }
  await mongoose.connect(MONGO_URL ?? '');
  mongoConnection.isConnected = 1;
};

export const dbDisconnect = async () => {
  // Don't disconnect in production to avoid "Client must be connected" errors
  // The connection pool will handle connection cleanup automatically
  return;
};

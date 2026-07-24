import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseConnection {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

// Global scope for caching connection in development
const cached: MongooseConnection = (global as unknown as { mongoose?: MongooseConnection }).mongoose || { conn: null, promise: null };

if (!cached) {
  (global as unknown as { mongoose: MongooseConnection }).mongoose = cached;
}

export const connectToDatabase = async () => {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) throw new Error('MONGODB_URI is missing');

  cached.promise = cached.promise || mongoose.connect(MONGODB_URI, {
    dbName: 'topladder',
    bufferCommands: false,
  }).then((mongoose) => {
    return mongoose.connection;
  });

  cached.conn = await cached.promise;
  return cached.conn;
}

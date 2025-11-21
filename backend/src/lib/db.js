import mongoose from "mongoose";
import { ENV } from "./env.js";

let isConnected = false;

export const connectDB = async () => {
  // If already connected, return early
  if (isConnected || mongoose.connection.readyState === 1) {
    console.log("MongoDB already connected");
    return;
  }

  // Check if MONGO_URI is set
  const mongoUri = ENV.MONGO_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    const error = new Error("MONGO_URI is not defined in environment variables");
    console.error("Error:", error.message);
    isConnected = false;
    if (process.env.VERCEL) {
      throw error;
    } else {
      process.exit(1);
    }
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      dbName: 'chat_db',
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    isConnected = true;
    console.log("MONGODB CONNECTED:", conn.connection.host);
    console.log("DATABASE NAME:", conn.connection.name);
  } catch (error) {
    console.error("Error connecting to MONGODB:", error.message);
    isConnected = false;
    // Don't exit process in serverless - let it retry
    if (process.env.VERCEL) {
      throw error; // Re-throw for serverless to handle
    } else {
      console.error("Full error:", error);
      process.exit(1); // Exit in local development
    }
  }
};

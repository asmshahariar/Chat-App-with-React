import mongoose from "mongoose";
import { ENV } from "./env.js";

let isConnected = false;

export const connectDB = async () => {
  // If already connected, return early
  if (isConnected || mongoose.connection.readyState === 1) {
    console.log("MongoDB already connected");
    return;
  }

  try {
    const conn = await mongoose.connect(ENV.MONGO_URI, {
      dbName: 'chat_db'
    });
    isConnected = true;
    console.log("MONGODB CONNECTED:", conn.connection.host);
    console.log("DATABASE NAME:", conn.connection.name);
  } catch (error) {
    console.error("Error connection to MONGODB:", error);
    isConnected = false;
    // Don't exit process in serverless - let it retry
    if (process.env.VERCEL) {
      throw error; // Re-throw for serverless to handle
    } else {
      process.exit(1); // Exit in local development
    }
  }
};

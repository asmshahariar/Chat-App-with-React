import mongoose from "mongoose";
import { ENV } from "./env.js";

let isConnected = false;
let connectionPromise = null;

export const connectDB = async () => {
  // If already connected, return early
  if (isConnected || mongoose.connection.readyState === 1) {
    console.log("MongoDB already connected");
    return Promise.resolve();
  }

  // If connection is in progress, return the existing promise
  if (connectionPromise) {
    return connectionPromise;
  }

  // Start new connection
  connectionPromise = (async () => {
    try {
      const { MONGO_URI } = ENV;
      if (!MONGO_URI) {
        throw new Error("MONGO_URI is not set in environment variables");
      }

      console.log("Attempting to connect to MongoDB...");
      const conn = await mongoose.connect(ENV.MONGO_URI, {
        dbName: 'chat_db',
        serverSelectionTimeoutMS: 10000, // 10 seconds timeout
        socketTimeoutMS: 45000, // 45 seconds socket timeout
      });
      
      isConnected = true;
      console.log("MONGODB CONNECTED:", conn.connection.host);
      console.log("DATABASE NAME:", conn.connection.name);
      return conn;
    } catch (error) {
      console.error("Error connecting to MONGODB:", error);
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        code: error.code
      });
      isConnected = false;
      connectionPromise = null; // Reset so we can retry
      
      // Don't exit process in serverless - let it retry
      if (process.env.VERCEL) {
        throw error; // Re-throw for serverless to handle
      } else {
        process.exit(1); // Exit in local development
      }
    }
  })();

  return connectionPromise;
};

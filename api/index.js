import app from "../backend/src/server.js";
import { connectDB } from "../backend/src/lib/db.js";
import mongoose from "mongoose";

// Connect to database when serverless function initializes
// This will be cached across function invocations
let dbConnectionPromise = null;
let isConnecting = false;

const ensureDBConnection = async () => {
  // If already connected, return
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  // If connection is in progress, wait for it
  if (dbConnectionPromise && isConnecting) {
    try {
      await dbConnectionPromise;
      return true;
    } catch (error) {
      console.error("DB connection promise failed:", error);
      dbConnectionPromise = null;
      isConnecting = false;
      return false;
    }
  }

  // Start new connection
  isConnecting = true;
  dbConnectionPromise = connectDB()
    .then(() => {
      console.log("Database connected in serverless function");
      isConnecting = false;
      return true;
    })
    .catch((error) => {
      console.error("Failed to connect to database:", error);
      dbConnectionPromise = null;
      isConnecting = false;
      return false;
    });

  try {
    return await dbConnectionPromise;
  } catch (error) {
    return false;
  }
};

// Try to connect immediately (non-blocking, don't throw)
ensureDBConnection().catch((error) => {
  console.error("Initial DB connection attempt failed (non-blocking):", error);
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ 
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

export default app;


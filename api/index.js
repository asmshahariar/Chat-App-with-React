import app from "../backend/src/server.js";
import { connectDB } from "../backend/src/lib/db.js";
import mongoose from "mongoose";

// Verify app is imported correctly
if (!app) {
  console.error("ERROR: App not imported from server.js");
  throw new Error("Failed to import Express app");
}

// Connect to database when serverless function initializes
// This will be cached across function invocations
let dbConnectionPromise = null;
let isConnecting = false;

const ensureDBConnection = async () => {
  // If already connected, return
  if (mongoose.connection.readyState === 1) {
    console.log("Database already connected (readyState: 1)");
    return true;
  }

  // If connection is in progress, wait for it
  if (dbConnectionPromise && isConnecting) {
    try {
      await dbConnectionPromise;
      return mongoose.connection.readyState === 1;
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
      return mongoose.connection.readyState === 1;
    })
    .catch((error) => {
      console.error("Failed to connect to database:", error);
      console.error("Error stack:", error.stack);
      dbConnectionPromise = null;
      isConnecting = false;
      return false;
    });

  try {
    const result = await dbConnectionPromise;
    return result === true || mongoose.connection.readyState === 1;
  } catch (error) {
    console.error("Error awaiting DB connection:", error);
    return false;
  }
};

// Try to connect immediately (non-blocking, don't throw)
ensureDBConnection().catch((error) => {
  console.error("Initial DB connection attempt failed (non-blocking):", error);
});

// Add middleware to ensure DB connection before handling requests
// Only add this middleware if app exists and has use method
if (app && typeof app.use === 'function') {
  app.use(async (req, res, next) => {
    // Skip DB check for health check and debug endpoints
    if (req.path === "/api/health" || req.path === "/api/debug") {
      return next();
    }

    try {
      const connected = await ensureDBConnection();
      if (!connected) {
        console.error("Database connection failed for request:", req.path);
        return res.status(503).json({ 
          message: "Database connection unavailable. Please try again.",
        });
      }
    } catch (error) {
      console.error("DB connection error in middleware:", error);
      return res.status(503).json({ 
        message: "Database connection error. Please try again.",
      });
    }
    next();
  });
}

// Add error handling middleware (must be last)
// Only add if app exists
if (app && typeof app.use === 'function') {
  app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  });
}

export default app;


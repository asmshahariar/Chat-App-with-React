// Vercel serverless function handler
// Import modules synchronously first
import express from "express";

// Initialize app variable
let app;
let isInitialized = false;
let initError = null;

// Initialize the app (this will be called on first request)
const initializeApp = async () => {
  if (isInitialized) {
    return app;
  }

  try {
    console.log("Initializing API function...");
    
    // Import backend app
    const serverModule = await import("../backend/src/server.js");
    app = serverModule.default;
    
    if (!app) {
      throw new Error("Failed to import Express app from server.js");
    }

    // Import database utilities
    const dbModule = await import("../backend/src/lib/db.js");
    const { connectDB } = dbModule;
    
    const mongooseModule = await import("mongoose");
    const mongoose = mongooseModule.default;

    // Log initialization
    console.log("API function initialized successfully");
    console.log("MONGO_URI exists:", !!process.env.MONGO_URI);
    console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);
    console.log("NODE_ENV:", process.env.NODE_ENV);

    // Database connection management
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

    // Try to connect immediately (non-blocking)
    ensureDBConnection().catch((error) => {
      console.error("Initial DB connection attempt failed (non-blocking):", error);
    });

    // Add middleware to ensure DB connection before handling requests
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
            console.error("MongoDB readyState:", mongoose.connection.readyState);
            return res.status(503).json({ 
              message: "Database connection unavailable. Please try again.",
              readyState: mongoose.connection.readyState
            });
          }
        } catch (error) {
          console.error("DB connection error in middleware:", error);
          return res.status(503).json({ 
            message: "Database connection error. Please try again.",
            error: error.message
          });
        }
        next();
      });

      // Add error handling middleware (must be last)
      app.use((err, req, res, next) => {
        console.error("Unhandled error:", err);
        console.error("Error stack:", err.stack);
        console.error("Request path:", req.path);
        res.status(500).json({ 
          message: "Internal server error",
          error: err.message,
          path: req.path
        });
      });
    }

    isInitialized = true;
    return app;
  } catch (error) {
    console.error("CRITICAL: Failed to initialize API function:", error);
    console.error("Init error stack:", error.stack);
    initError = error;
    
    // Create a minimal error app
    const errorApp = express();
    errorApp.use(express.json());
    errorApp.use((req, res) => {
      res.status(500).json({
        message: "Server initialization failed",
        error: error.message,
        details: "Check Vercel function logs for more information"
      });
    });
    
    app = errorApp;
    isInitialized = true;
    return app;
  }
};

// Export handler function for Vercel
// Vercel automatically routes /api/* to this function
export default async (req, res) => {
  try {
    // Initialize app on first request
    const appInstance = await initializeApp();
    
    // Log request for debugging
    console.log(`[${req.method}] ${req.url}`);
    console.log("Request path:", req.path || req.url);
    console.log("Request method:", req.method);
    
    // Handle the request - Express app will handle routing
    // Pass a no-op error handler since Express handles errors via middleware
    appInstance(req, res);
  } catch (error) {
    console.error("Handler error:", error);
    console.error("Error stack:", error.stack);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Internal server error",
        error: error.message
      });
    }
  }
};

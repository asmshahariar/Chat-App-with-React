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
    console.log("Current working directory:", process.cwd());
    console.log("MONGO_URI exists:", !!process.env.MONGO_URI);
    console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);
    console.log("NODE_ENV:", process.env.NODE_ENV);
    
    // Import backend app with detailed error handling
    let serverModule;
    try {
      console.log("Attempting to import server.js...");
      serverModule = await import("../backend/src/server.js");
      console.log("Server module imported successfully");
      console.log("Server module keys:", Object.keys(serverModule));
    } catch (importError) {
      console.error("Failed to import server.js:", importError);
      console.error("Import error message:", importError.message);
      console.error("Import error stack:", importError.stack);
      throw new Error(`Failed to import server.js: ${importError.message}`);
    }
    
    app = serverModule.default;
    
    if (!app) {
      console.error("Server module.default is:", serverModule.default);
      console.error("Server module:", serverModule);
      throw new Error("Failed to import Express app from server.js - default export is missing");
    }
    
    console.log("Express app imported successfully");
    console.log("App type:", typeof app);
    console.log("App has use method:", typeof app.use === "function");

    // Import database utilities
    let dbModule;
    try {
      dbModule = await import("../backend/src/lib/db.js");
      console.log("Database module imported successfully");
    } catch (dbImportError) {
      console.error("Failed to import db.js:", dbImportError);
      // Don't throw - we can still use the app without immediate DB connection
    }
    
    const { connectDB } = dbModule || {};
    
    const mongooseModule = await import("mongoose");
    const mongoose = mongooseModule.default;

    // Log initialization
    console.log("API function initialized successfully");

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
        // Skip DB check for health check, debug, and test endpoints
        if (req.path === "/api/health" || req.path === "/api/debug" || req.path === "/api/test") {
          return next();
        }

        try {
          // Try to connect with a shorter timeout for serverless
          const connected = await Promise.race([
            ensureDBConnection(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Database connection timeout")), 10000)
            )
          ]);
          
          if (!connected) {
            console.error("Database connection failed for request:", req.path);
            console.error("MongoDB readyState:", mongoose.connection.readyState);
            console.error("MONGO_URI exists:", !!process.env.MONGO_URI);
            return res.status(503).json({ 
              message: "Database connection unavailable. Please try again.",
              readyState: mongoose.connection.readyState,
              hint: "Check MongoDB network access and MONGO_URI environment variable"
            });
          }
        } catch (error) {
          console.error("DB connection error in middleware:", error);
          console.error("Error name:", error.name);
          console.error("Error code:", error.code);
          console.error("Error message:", error.message);
          return res.status(503).json({ 
            message: "Database connection error. Please try again.",
            error: error.message,
            errorCode: error.code,
            hint: error.message.includes("timeout") 
              ? "Database connection timed out. Check MongoDB network access."
              : "Check MONGO_URI and MongoDB network access settings."
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
    console.error("Init error name:", error.name);
    console.error("Init error message:", error.message);
    console.error("Init error code:", error.code);
    console.error("Init error stack:", error.stack);
    
    // Try to get more details about the error
    if (error.cause) {
      console.error("Init error cause:", error.cause);
    }
    if (error.code === "MODULE_NOT_FOUND") {
      console.error("MODULE_NOT_FOUND - This usually means a dependency is missing");
      console.error("Missing module:", error.message.match(/Cannot find module '([^']+)'/)?.[1]);
    }
    
    initError = error;
    
    // Create a minimal error app that provides more details
    const errorApp = express();
    errorApp.use(express.json());
    errorApp.use((req, res) => {
      res.status(500).json({
        message: "Server initialization failed",
        error: error.message,
        errorName: error.name,
        errorCode: error.code,
        details: "Check Vercel function logs for more information",
        hint: error.code === "MODULE_NOT_FOUND" 
          ? "A required module is missing. Check package.json dependencies."
          : "Check the Vercel function logs for the full error stack trace."
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
    console.log(`[${req.method}] ${req.url || req.path || req.originalUrl}`);
    console.log("Request headers:", JSON.stringify(req.headers, null, 2));
    
    // Wrap Express handler to catch any unhandled errors
    const originalEnd = res.end;
    res.end = function(...args) {
      console.log(`Response sent: ${res.statusCode}`);
      return originalEnd.apply(this, args);
    };
    
    // Handle the request - Express will route it
    // Use a timeout to prevent hanging requests
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        console.error("Request timeout after 30 seconds");
        res.status(504).json({
          message: "Request timeout",
          error: "The request took too long to process"
        });
      }
    }, 30000);
    
    // Handle request with error catching
    appInstance(req, res, (err) => {
      clearTimeout(timeout);
      if (err) {
        console.error("Express error handler:", err);
        console.error("Error stack:", err.stack);
        if (!res.headersSent) {
          res.status(500).json({
            message: "Internal server error",
            error: err.message,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
          });
        }
      }
    });
    
    // Clear timeout when response is sent
    res.on("finish", () => {
      clearTimeout(timeout);
    });
    
  } catch (error) {
    console.error("Handler error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    console.error("Error code:", error.code);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
        name: error.name,
        code: error.code,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      });
    }
  }
};

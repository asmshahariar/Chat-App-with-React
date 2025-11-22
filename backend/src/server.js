import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import cors from "cors";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import friendRoutes from "./routes/friend.route.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";
import { app, server } from "./lib/socket.js";

const __dirname = path.resolve();

const PORT = ENV.PORT || 3000;

app.use(express.json({ limit: "50mb" })); // req.body - increased for base64 images
app.use(express.urlencoded({ limit: "50mb", extended: true })); // For form data

// CORS configuration - allow multiple origins
const allowedOrigins = [
  ENV.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://chat-app-with-react-three.vercel.app",
  "https://chat-two-react.vercel.app",
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log("CORS: No origin, allowing request");
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log("CORS: Origin allowed:", origin);
      return callback(null, true);
    }
    
    // Allow all origins in development
    if (ENV.NODE_ENV === "development") {
      console.log("CORS: Development mode, allowing origin:", origin);
      return callback(null, true);
    }
    
    // In production, allow all Vercel deployments (*.vercel.app)
    if (origin.includes(".vercel.app")) {
      console.log("CORS: Vercel deployment, allowing origin:", origin);
      return callback(null, true);
    }
    
    // Also allow vercel.app domain (without subdomain)
    if (origin.includes("vercel.app")) {
      console.log("CORS: Vercel domain, allowing origin:", origin);
      return callback(null, true);
    }
    
    // For production, be more permissive to avoid CORS issues
    // You can restrict this later if needed
    console.log("CORS: Allowing origin in production:", origin);
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

app.use(cookieParser());

// Health check endpoint (before auth)
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check environment and database status
app.get("/api/debug", async (req, res) => {
  // Prevent caching
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  
  const mongoose = (await import("mongoose")).default;
  
  // Try to get connection info
  let dbInfo = {
    readyState: mongoose.connection.readyState,
    readyStateText: ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] || "unknown",
    host: mongoose.connection.host || "not connected",
    name: mongoose.connection.name || "not connected",
  };
  
  // If not connected, try to get more info
  if (mongoose.connection.readyState !== 1) {
    try {
      const { connectDB } = await import("./lib/db.js");
      // Don't actually connect, just check if function exists
      dbInfo.connectionFunctionExists = typeof connectDB === "function";
    } catch (error) {
      dbInfo.connectionError = error.message;
    }
  }
  
  res.json({
    timestamp: new Date().toISOString(),
    env: {
      hasMongoUri: !!process.env.MONGO_URI,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasClientUrl: !!process.env.CLIENT_URL,
      nodeEnv: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL,
      clientUrl: process.env.CLIENT_URL || "not set",
    },
    db: dbInfo,
    request: {
      method: req.method,
      path: req.path,
      url: req.url,
      origin: req.headers.origin || "none",
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friends", friendRoutes);

// make ready for deployment
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (_, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// Only start server if not in Vercel serverless environment
if (!process.env.VERCEL) {
  if (server) {
    server.listen(PORT, () => {
      console.log("Server running on port: " + PORT);
      connectDB();
    });
  }
}

// Export app for Vercel serverless functions
export default app;
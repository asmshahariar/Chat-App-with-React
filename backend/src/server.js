import express from "express";
import dotenv from "dotenv";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.route..js";
import messageRoutes from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";

dotenv.config();

const app = express();

const __dirname = path.resolve();

const PORT = ENV.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

// CORS configuration
const allowedOrigins = [
  ENV.CLIENT_URL,
  "https://chat-app-with-react-three.vercel.app",
  "http://localhost:5173",
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === "development") {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now, can restrict later
    }
  },
  credentials: true,
}));

app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Chat App API Server", status: "running" });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    res.json({ 
      status: "ok", 
      database: dbStatus,
      mongoUri: process.env.MONGO_URI ? "set" : "not set",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: "error", 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// make ready for deployment
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (_, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// Start server locally (Vercel will use api/index.js)
if (!process.env.VERCEL) {
  // Only import and initialize socket.io for local development
  try {
    const { createServer } = await import("http");
    const { initializeSocket } = await import("./lib/socket.js");
    const server = createServer(app);
    initializeSocket(server);
    server.listen(PORT, () => {
      console.log("Server is running on port: " + PORT);
      connectDB();
    });
  } catch (error) {
    console.error("Error setting up server:", error);
    // If socket.io fails, still try to start basic server
    const { createServer } = await import("http");
    const server = createServer(app);
    server.listen(PORT, () => {
      console.log("Server is running on port: " + PORT + " (without socket.io)");
      connectDB();
    });
  }
}

export default app;


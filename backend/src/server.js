import express from "express";
import dotenv from "dotenv";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";

import authRoutes from "./routes/auth.route..js";
import messageRoutes from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";
import { initializeSocket } from "./lib/socket.js";

dotenv.config();

const app = express();
const server = createServer(app);

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

// make ready for deployment
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (_, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// Initialize Socket.IO (only for local development, not for Vercel serverless)
if (!process.env.VERCEL) {
  initializeSocket(server);
}

// Start server locally (Vercel will use api/index.js)
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log("Server is running on port: " + PORT);
    connectDB();
  });
}

export default app;
export { server };


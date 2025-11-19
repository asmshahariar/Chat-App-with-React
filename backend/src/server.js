import express from "express";
import dotenv from "dotenv";
import path from "path";
import cookieParser from "cookie-parser";


import authRoutes from "./routes/auth.route..js";
import messageRoutes from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";

dotenv.config();

const app = express();

const __dirname = path.resolve();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Chat App API Server", status: "running" });
});

// make ready for deployment
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (_, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// Start server locally (Vercel will use api/index.js)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log("Server is running on port: " + PORT);
    connectDB();
  });
}

export default app;


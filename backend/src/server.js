import express from "express";
import dotenv from "dotenv";
import path from "path";


import authRoutes from "./routes/auth.route..js";
import messageRoutes from "./routes/message.route.js";


dotenv.config();

const app = express();

const __dirname = path.resolve();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// make ready for deployment
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (_, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// Start server locally (Vercel will use api/index.js)
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log("Server is running on port: " + PORT));
}

export default app;


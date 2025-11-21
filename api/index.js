import app from "../backend/src/server.js";
import { connectDB } from "../backend/src/lib/db.js";

// Connect to database when serverless function initializes
connectDB().catch((error) => {
  console.error("Failed to connect to database on initialization:", error);
});

export default app;


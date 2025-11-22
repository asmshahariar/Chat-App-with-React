import jwt from "jsonwebtoken";
import { ENV } from "./env.js";

export const generateToken = (userId, res) => {
  const { JWT_SECRET } = ENV;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
    httpOnly: true, // prevent XSS attacks: cross-site scripting
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // "none" for cross-origin in production, "lax" for development
    secure: process.env.NODE_ENV === "production" ? true : false, 
    path: "/", // Ensure cookie is available for all routes
  });

  return token;
};

// http://localhost
// https://dsmakmk.com

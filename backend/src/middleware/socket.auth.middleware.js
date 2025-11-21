import jwt from "jsonwebtoken";
import { ENV } from "../lib/env.js";
import User from "../models/User.js";

export const socketAuthMiddleware = async (socket, next) => {
  try {
    // Get token from cookies (httpOnly cookie sent automatically with credentials)
    const cookies = socket.handshake.headers?.cookie || "";
    const tokenMatch = cookies.match(/jwt=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      console.log("Socket auth: No token found in cookies");
      return next(new Error("Authentication error: No token provided"));
    }

    // Verify token
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    
    if (!decoded || !decoded.userId) {
      console.log("Socket auth: Invalid token decode");
      return next(new Error("Authentication error: Invalid token"));
    }

    // Get user from database
    const user = await User.findById(decoded.userId).select("-password");
    
    if (!user) {
      console.log("Socket auth: User not found");
      return next(new Error("Authentication error: User not found"));
    }

    // Attach user to socket
    socket.user = user;
    socket.userId = user._id.toString();

    next();
  } catch (error) {
    console.error("Socket auth error:", error);
    // Don't block connection if auth fails - just log it
    // In production, you might want to be stricter
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new Error("Authentication error: " + error.message));
    }
    next(new Error("Authentication error: " + error.message));
  }
};


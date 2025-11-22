import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  ENV.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://chat-app-with-react-three.vercel.app",
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1 || ENV.NODE_ENV === "development") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  },
});

// apply authentication middleware to all socket connections
io.use(socketAuthMiddleware);

// we will use this function to check if the user is online or not
export function getReceiverSocketId(userId) {
  const normalizedUserId = userId?.toString();
  // Try direct lookup
  let socketId = userSocketMap[normalizedUserId];
  // If not found, try to find by matching any key
  if (!socketId) {
    const matchingKey = Object.keys(userSocketMap).find(key => key.toString() === normalizedUserId);
    if (matchingKey) {
      socketId = userSocketMap[matchingKey];
    }
  }
  return socketId;
}

// this is for storig online users
const userSocketMap = {}; // {userId:socketId}
// Store typing status: {userId: {receiverId: true/false}}
const typingUsers = {}; // {userId: {receiverId: timestamp}}

io.on("connection", (socket) => {
  console.log("A user connected", socket.user.fullName);

  const userId = socket.userId.toString(); // Ensure userId is always a string
  userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle request for online users
  socket.on("request-online-users", () => {
    socket.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  // Handle typing start event
  socket.on("typing-start", (receiverId) => {
    if (!typingUsers[userId]) {
      typingUsers[userId] = {};
    }
    typingUsers[userId][receiverId] = Date.now();
    
    // Emit to the receiver only
    const normalizedReceiverId = receiverId?.toString();
    const receiverSocketId = getReceiverSocketId(normalizedReceiverId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user-typing", {
        userId: userId.toString(),
        fullName: socket.user.fullName,
      });
    }
  });

  // Handle typing stop event
  socket.on("typing-stop", (receiverId) => {
    if (typingUsers[userId]) {
      delete typingUsers[userId][receiverId];
    }
    
    // Emit to the receiver only
    const receiverSocketId = userSocketMap[receiverId?.toString()];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user-stopped-typing", {
        userId: userId.toString(), // Ensure userId is a string
      });
    }
  });

  // with socket.on we listen for events from clients
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.user.fullName);
    delete userSocketMap[userId];
    delete typingUsers[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };

import { Server } from "socket.io";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

let io = null;
const userSocketMap = {}; // {userId: socketId}

// we will use this function to check if the user is online or not
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

export const initializeSocket = (server) => {
  try {
    io = new Server(server, {
      cors: {
        origin: [
          process.env.CLIENT_URL || "http://localhost:5173",
          "https://chat-app-with-react-three.vercel.app",
          "http://localhost:5173",
        ],
        credentials: true,
        methods: ["GET", "POST"],
      },
    });

    // Apply authentication middleware to all socket connections
    io.use(socketAuthMiddleware);
  } catch (error) {
    console.error("Failed to initialize socket.io:", error);
    // Don't crash the server if socket initialization fails
    return null;
  }

  if (io) {
    io.on("connection", (socket) => {
      console.log("A user connected:", socket.user?.fullName || socket.id);

      const userId = socket.userId;
      if (userId) {
        userSocketMap[userId] = socket.id;

        // Emit online users list to all clients
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
      }

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.user?.fullName || socket.id);
        if (userId) {
          delete userSocketMap[userId];
          io.emit("getOnlineUsers", Object.keys(userSocketMap));
        }
      });
    });
  }

  return io;
};

export const getIO = () => {
  return io;
};

export const getOnlineUsers = () => {
  return Object.keys(userSocketMap);
};

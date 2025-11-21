import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  socket: null,
  onlineUsers: [],

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    // Use environment variable or default to localhost for development
    // For production, you'll need a separate WebSocket server since Vercel doesn't support WebSockets
    const socketURL = import.meta.env.VITE_SOCKET_URL || 
      (import.meta.env.MODE === "production" 
        ? "https://chat-app-with-react-three.vercel.app" 
        : "http://localhost:3000");
    
    try {
      // Get JWT token from cookies (it's httpOnly, so we can't access it directly)
      // The socket middleware will read it from cookies automatically
      const socket = io(socketURL, {
        withCredentials: true,
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        auth: {
          // Token will be read from cookies by the middleware
        },
      });

      socket.on("connect", () => {
        console.log("Socket connected");
        // User is automatically added to online users when socket connects
        // The server will emit "getOnlineUsers" with the updated list
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected");
      });

      socket.on("connect_error", (error) => {
        console.log("Socket connection error:", error);
        // Fallback: If socket fails, assume all users are online (temporary solution)
        // In production, you'd want to use a separate WebSocket service
        if (import.meta.env.MODE === "production") {
          console.log("Socket.io not available in serverless environment. Using fallback.");
        }
      });

      socket.on("getOnlineUsers", (onlineUsers) => {
        set({ onlineUsers: onlineUsers || [] });
      });

      set({ socket });
    } catch (error) {
      console.error("Failed to initialize socket:", error);
      // Fallback: Set empty online users array if socket fails
      set({ socket: null, onlineUsers: [] });
    }
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },

  checkAuth: async () => {
    try {
      const response = await axiosInstance.get("auth/check");
      set({ authUser: response.data });
      // Connect socket after successful auth check
      if (response.data) {
        get().connectSocket();
      }
    } catch (error) {
      set({ authUser: null });
      get().disconnectSocket();
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data.user });
      
       toast.success("Signup successful"); //toast notification - install react-toastify or sonner

    } catch (error) {
        toast.error("Signup failed"); //toast notification
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });

      toast.success("Logged in successfully");

      // Connect socket after successful login (don't block on errors)
      setTimeout(() => {
        try {
          get().connectSocket();
        } catch (socketError) {
          console.error("Socket connection error (non-blocking):", socketError);
          // Don't show error to user - socket is optional
        }
      }, 100);
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Login failed. Please try again.";
      toast.error(errorMessage);
    } finally {
      set({ isLoggingIn: false });
    }
  },


  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error("Error logging out");
      console.log("Logout error:", error);
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in update profile:", error);
      toast.error(error.response.data.message);
    }
  },

}));

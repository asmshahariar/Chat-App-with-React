import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  socket: null,
  onlineUsers: [],

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in authCheck:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });

      toast.success("Account created successfully!");
      get().connectSocket();
    } catch (error) {
      console.error("Signup error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to create account";
      toast.error(errorMessage);
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

      get().connectSocket();
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to login";
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
      const errorMessage = error.response?.data?.message || error.message || "Failed to update profile";
      toast.error(errorMessage);
    }
  },

  connectSocket: () => {
    const { authUser, socket: existingSocket } = get();
    if (!authUser) return;
    
    // If socket already exists and is connected, don't create a new one
    if (existingSocket?.connected) {
      return;
    }

    // Disconnect existing socket if it exists but isn't connected
    if (existingSocket) {
      existingSocket.disconnect();
    }

    const socket = io(BASE_URL, {
      withCredentials: true, // this ensures cookies are sent with the connection
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected successfully");
      // Request online users when connected
      socket.emit("request-online-users");
      
      // Re-subscribe to messages if there's a selected user
      import("./useChatStore").then(({ useChatStore }) => {
        const chatState = useChatStore.getState();
        if (chatState.selectedUser) {
          console.log("Re-subscribing to messages after socket connect");
          chatState.subscribeToMessages();
        }
      });
      
      // Subscribe to friend requests after socket connects
      import("./useFriendStore").then(({ useFriendStore }) => {
        useFriendStore.getState().subscribeToFriendRequests();
      });
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socket.on("reconnect", () => {
      console.log("✅ Socket reconnected");
      // Request online users when reconnected
      socket.emit("request-online-users");
      
      // Re-subscribe to messages if there's a selected user
      import("./useChatStore").then(({ useChatStore }) => {
        const chatState = useChatStore.getState();
        if (chatState.selectedUser) {
          console.log("Re-subscribing to messages after socket reconnect");
          chatState.subscribeToMessages();
        }
      });
      
      // Re-subscribe to friend requests on reconnect
      import("./useFriendStore").then(({ useFriendStore }) => {
        useFriendStore.getState().subscribeToFriendRequests();
      });
    });

    // listen for online users event
    socket.on("getOnlineUsers", (userIds) => {
      // Normalize all IDs to strings for consistent comparison
      const normalizedIds = (userIds || []).map((id) => id?.toString()).filter(Boolean);
      console.log("Received online users:", normalizedIds);
      set({ onlineUsers: normalizedIds });
    });

    set({ socket });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));

import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useChatStore } from "./useChatStore";
import { useAuthStore } from "./useAuthStore";

export const useFriendStore = create((set, get) => ({
  friendRequests: {
    sent: [],
    received: [],
  },
  friends: [],
  isLoading: false,
  lastReceivedCount: 0, // Track number of received requests for notification

  // Subscribe to friend request socket events
  subscribeToFriendRequests: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) {
      return;
    }

    // If socket not connected yet, wait for it
    if (!socket.connected) {
      socket.once("connect", () => {
        get().subscribeToFriendRequests();
      });
      return;
    }

    // Clear previous listeners to prevent duplicates
    socket.off("newFriendRequest");
    socket.off("friendRequestAccepted");
    socket.off("friendRequestRejected");
    socket.off("friendRequestCancelled");

    // Listen for new friend request
    socket.on("newFriendRequest", (friendRequest) => {
      console.log("New friend request received:", friendRequest);
      
      // Play notification sound
      const isSoundEnabled = useChatStore.getState().isSoundEnabled;
      if (isSoundEnabled) {
        const notificationSound = new Audio("/sounds/notification.mp3");
        notificationSound.currentTime = 0;
        notificationSound.play().catch((e) => console.log("Audio play failed:", e));
      }

      // Update friend requests state
      get().getFriendRequests(true); // Refresh friend requests
      useChatStore.getState().getAllContacts(); // Refresh contacts
    });

    // Listen for friend request accepted
    socket.on("friendRequestAccepted", (friendRequest) => {
      console.log("Friend request accepted:", friendRequest);
      // Refresh friend requests, friends, contacts, and chats
      get().getFriendRequests(true);
      get().getFriends();
      useChatStore.getState().getAllContacts();
      useChatStore.getState().getMyChatPartners();
    });

    // Listen for friend request rejected
    socket.on("friendRequestRejected", (friendRequest) => {
      console.log("Friend request rejected:", friendRequest);
      // Refresh friend requests and contacts
      get().getFriendRequests(true);
      useChatStore.getState().getAllContacts();
    });

    // Listen for friend request cancelled
    socket.on("friendRequestCancelled", (data) => {
      console.log("Friend request cancelled:", data);
      // Refresh friend requests and contacts
      get().getFriendRequests(true);
      useChatStore.getState().getAllContacts();
    });
  },

  // Unsubscribe from friend request socket events
  unsubscribeFromFriendRequests: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newFriendRequest");
      socket.off("friendRequestAccepted");
      socket.off("friendRequestRejected");
      socket.off("friendRequestCancelled");
    }
  },

  // Get all friend requests
  getFriendRequests: async (isInitialLoad = false) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/friends/requests");
      const newReceivedCount = res.data.received?.length || 0;
      const previousReceivedCount = get().lastReceivedCount || 0;
      
      // Play notification sound if new friend request received (not on initial load)
      if (!isInitialLoad && newReceivedCount > previousReceivedCount && previousReceivedCount >= 0) {
        const isSoundEnabled = useChatStore.getState().isSoundEnabled;
        if (isSoundEnabled) {
          const notificationSound = new Audio("/sounds/notification.mp3");
          notificationSound.currentTime = 0;
          notificationSound.play().catch((e) => console.log("Audio play failed:", e));
        }
      }
      
      set({ 
        friendRequests: res.data,
        lastReceivedCount: newReceivedCount
      });
    } catch (error) {
      console.error("Error fetching friend requests:", error);
      toast.error(error.response?.data?.message || "Failed to load friend requests");
    } finally {
      set({ isLoading: false });
    }
  },

  // Get all friends
  getFriends: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/friends/friends");
      set({ friends: res.data });
    } catch (error) {
      console.error("Error fetching friends:", error);
      toast.error(error.response?.data?.message || "Failed to load friends");
    } finally {
      set({ isLoading: false });
    }
  },

  // Send a friend request
  sendFriendRequest: async (receiverId) => {
    try {
      const res = await axiosInstance.post(`/friends/request/${receiverId}`);
      toast.success("Friend request sent");
      
      // Refresh friend requests and contacts
      get().getFriendRequests();
      useChatStore.getState().getAllContacts();
      return res.data;
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error(error.response?.data?.message || "Failed to send friend request");
      throw error;
    }
  },

  // Accept a friend request
  acceptFriendRequest: async (requestId) => {
    try {
      const res = await axiosInstance.put(`/friends/accept/${requestId}`);
      toast.success("Friend request accepted");
      // Refresh friend requests, friends, contacts, and chats
      get().getFriendRequests();
      get().getFriends();
      useChatStore.getState().getAllContacts();
      useChatStore.getState().getMyChatPartners();
      return res.data;
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error(error.response?.data?.message || "Failed to accept friend request");
      throw error;
    }
  },

  // Reject a friend request
  rejectFriendRequest: async (requestId) => {
    try {
      const res = await axiosInstance.put(`/friends/reject/${requestId}`);
      toast.success("Friend request rejected");
      // Refresh friend requests and contacts
      get().getFriendRequests();
      useChatStore.getState().getAllContacts();
      return res.data;
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      toast.error(error.response?.data?.message || "Failed to reject friend request");
      throw error;
    }
  },

  // Cancel a friend request
  cancelFriendRequest: async (requestId) => {
    try {
      const res = await axiosInstance.delete(`/friends/cancel/${requestId}`);
      toast.success("Friend request cancelled");
      // Refresh friend requests and contacts
      get().getFriendRequests();
      useChatStore.getState().getAllContacts();
      return res.data;
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      toast.error(error.response?.data?.message || "Failed to cancel friend request");
      throw error;
    }
  },
}));


import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useChatStore } from "./useChatStore";

export const useFriendStore = create((set, get) => ({
  friendRequests: {
    sent: [],
    received: [],
  },
  friends: [],
  isLoading: false,

  // Get all friend requests
  getFriendRequests: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/friends/requests");
      set({ friendRequests: res.data });
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


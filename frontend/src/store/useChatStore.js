import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,
  typingUsers: {}, // {userId: {fullName: string}}

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) => {
    // Ensure isFriend property is preserved
    const userWithFriendStatus = {
      ...selectedUser,
      isFriend: selectedUser.isFriend === true, // Only set to true if explicitly true
    };
    set({ selectedUser: userWithFriendStatus });
  },

  getAllContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      // Ensure all contacts have isFriend property
      const contacts = (res.data || []).map(contact => ({
        ...contact,
        isFriend: contact.isFriend || false,
        friendRequestStatus: contact.friendRequestStatus || null,
        friendRequestId: contact.friendRequestId || null,
      }));
      set({ allContacts: contacts });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load contacts");
      set({ allContacts: [] });
    } finally {
      set({ isUsersLoading: false });
    }
  },
  getMyChatPartners: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      // Ensure all chat partners are marked as friends
      const chatPartners = (res.data || []).map(chat => ({
        ...chat,
        isFriend: true, // Chat partners are always friends
      }));
      set({ chats: chatPartners });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load chats");
      set({ chats: [] });
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessagesByUserId: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const { authUser } = useAuthStore.getState();

    // Check if users are friends
    if (!selectedUser.isFriend) {
      toast.error(`You must be friends with ${selectedUser.fullName} to send messages.`);
      return;
    }

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    // Immediately update the UI by adding the message
    set({ messages: [...messages, optimisticMessage] });

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      const savedMessage = res.data;
      
      // Replace optimistic message with real message from server
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? savedMessage : msg
        ),
      }));
    } catch (error) {
      // Remove optimistic message on failure
      set({ messages: messages.filter((msg) => msg._id !== tempId) });
      const errorMessage = error.response?.data?.message || "Something went wrong";
      toast.error(errorMessage);
    }
  },

  emitTypingStart: (receiverId) => {
    const socket = useAuthStore.getState().socket;
    if (socket && socket.connected) {
      const normalizedReceiverId = receiverId?.toString();
      socket.emit("typing-start", normalizedReceiverId);
    }
  },

  emitTypingStop: (receiverId) => {
    const socket = useAuthStore.getState().socket;
    if (socket && socket.connected) {
      const normalizedReceiverId = receiverId?.toString();
      socket.emit("typing-stop", normalizedReceiverId);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    
    if (!socket.connected) {
      socket.once("connect", () => {
        get().subscribeToMessages();
      });
      return;
    }

    socket.on("newMessage", (newMessage) => {
      // Normalize IDs for comparison
      const messageSenderId = newMessage.senderId?.toString();
      const selectedUserIdStr = selectedUser._id?.toString();
      const currentUserId = useAuthStore.getState().authUser?._id?.toString();
      
      // Check if message is from selected user OR if it's a message sent to current user
      const isFromSelectedUser = messageSenderId === selectedUserIdStr;
      const isToCurrentUser = newMessage.receiverId?.toString() === currentUserId;
      
      // Only add message if it's from the selected user (when viewing their chat) 
      // OR if it's sent to current user (real-time update)
      if (!isFromSelectedUser && !isToCurrentUser) {
        return;
      }

      const currentMessages = get().messages;
      // Check if message already exists (avoid duplicates)
      const messageExists = currentMessages.some(
        (msg) => msg._id?.toString() === newMessage._id?.toString()
      );
      
      if (messageExists) {
        return;
      }

      set({ messages: [...currentMessages, newMessage] });

      if (isSoundEnabled && isToCurrentUser) {
        const notificationSound = new Audio("/sounds/notification.mp3");
        notificationSound.currentTime = 0;
        notificationSound.play().catch((e) => console.log("Audio play failed:", e));
      }
    });

    socket.on("user-typing", (data) => {
      const { userId, fullName } = data || {};
      if (!userId) return;
      
      // Normalize userId to string for consistent comparison
      const normalizedUserId = userId?.toString();
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [normalizedUserId]: { fullName },
        },
      }));
    });

    socket.on("user-stopped-typing", ({ userId }) => {
      // Normalize userId to string for consistent comparison
      const normalizedUserId = userId?.toString();
      set((state) => {
        const newTypingUsers = { ...state.typingUsers };
        delete newTypingUsers[normalizedUserId];
        return { typingUsers: newTypingUsers };
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("user-typing");
      socket.off("user-stopped-typing");
    }
  },
}));

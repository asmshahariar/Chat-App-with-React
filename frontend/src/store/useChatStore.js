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
    // If null, just set it to null
    if (!selectedUser) {
      set({ selectedUser: null });
      return;
    }
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
    set({ messages: [] }); // Clear messages while loading new ones
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      // Ensure messages are properly formatted with normalized IDs
      const normalizedMessages = res.data.map((msg) => ({
        ...msg,
        senderId: msg.senderId?._id || msg.senderId,
        receiverId: msg.receiverId?._id || msg.receiverId,
      }));
      set({ messages: normalizedMessages });
    } catch (error) {
      // Only show toast if it's not a "no messages" scenario (e.g., 404)
      if (error.response?.status !== 404) {
        toast.error(error.response?.data?.message || "Something went wrong fetching messages");
      }
      set({ messages: [] }); // Ensure messages are empty on error
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
              senderId: authUser._id.toString(), // Ensure it's a string
              receiverId: selectedUser._id.toString(), // Ensure it's a string
              text: messageData.text,
              image: messageData.image,
              file: messageData.file ? (messageData.file.startsWith('data:') ? null : messageData.file) : null, // Don't store base64 in optimistic message
              fileName: messageData.fileName || null,
              fileType: messageData.fileType || null,
              fileSize: messageData.fileSize || null,
              createdAt: new Date().toISOString(),
              isOptimistic: true,
            };
    // Immediately update the UI by adding the message
    set({ messages: [...messages, optimisticMessage] });

            try {
              const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
              const savedMessage = res.data;
              
              // Normalize the saved message
              const normalizedSavedMessage = {
                ...savedMessage,
                senderId: savedMessage.senderId?._id || savedMessage.senderId,
                receiverId: savedMessage.receiverId?._id || savedMessage.receiverId,
              };
              
              // Replace optimistic message with real message from server
              set((state) => ({
                messages: state.messages.map((msg) =>
                  msg._id === tempId ? normalizedSavedMessage : msg
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
    if (!selectedUser) {
      return;
    }

    const socket = useAuthStore.getState().socket;
    if (!socket) {
      // Try to connect socket if not available
      const { connectSocket } = useAuthStore.getState();
      connectSocket();
      // Wait a bit and retry
      setTimeout(() => {
        if (useAuthStore.getState().socket) {
          get().subscribeToMessages();
        }
      }, 500);
      return;
    }
    
    if (!socket.connected) {
      socket.once("connect", () => {
        get().subscribeToMessages();
      });
      return;
    }

    // Remove any existing listeners to prevent duplicates
    socket.off("newMessage");
    
    socket.on("newMessage", (newMessage) => {
      console.log("📨 Received newMessage via socket:", newMessage);
      
      // Normalize IDs for comparison - handle both object and string formats
      const messageSenderId = newMessage.senderId?._id?.toString() || newMessage.senderId?.toString();
      const messageReceiverId = newMessage.receiverId?._id?.toString() || newMessage.receiverId?.toString();
      
      const currentState = get();
      const selectedUserIdStr = currentState.selectedUser?._id?.toString();
      const currentUserId = useAuthStore.getState().authUser?._id?.toString();
      
      console.log("Message IDs:", {
        messageSenderId,
        messageReceiverId,
        selectedUserIdStr,
        currentUserId
      });
      
      if (!currentUserId) {
        console.log("❌ No current user");
        return; // No current user, skip
      }
      
      // Check if message involves the current user (either as sender or receiver)
      const isToCurrentUser = messageReceiverId === currentUserId;
      const isFromCurrentUser = messageSenderId === currentUserId;
      
      console.log("Message checks:", {
        isToCurrentUser,
        isFromCurrentUser
      });
      
      // Only process messages that involve the current user
      if (!isToCurrentUser && !isFromCurrentUser) {
        console.log("❌ Message doesn't involve current user");
        return; // Message doesn't involve current user, skip
      }
      
      // If there's a selected user, only add message if it's between current user and selected user
      if (selectedUserIdStr) {
        const isBetweenCurrentAndSelected = 
          (messageSenderId === currentUserId && messageReceiverId === selectedUserIdStr) ||
          (messageSenderId === selectedUserIdStr && messageReceiverId === currentUserId);
        
        console.log("Between check:", {
          isBetweenCurrentAndSelected,
          condition1: messageSenderId === currentUserId && messageReceiverId === selectedUserIdStr,
          condition2: messageSenderId === selectedUserIdStr && messageReceiverId === currentUserId
        });
        
        if (!isBetweenCurrentAndSelected) {
          console.log("❌ Message not between current and selected user");
          return; // Not viewing this chat, skip adding to messages
        }
      }
      
      console.log("✅ Message passed all checks, adding to messages");

      const currentMessages = get().messages;
      // Check if message already exists (avoid duplicates)
      const messageExists = currentMessages.some(
        (msg) => msg._id?.toString() === newMessage._id?.toString()
      );
      
      if (messageExists) {
        // Update existing message (in case it was optimistic)
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg._id?.toString() === newMessage._id?.toString() ? newMessage : msg
          ),
        }));
        return;
      }

      // Normalize the new message before adding
      const normalizedMessage = {
        ...newMessage,
        senderId: newMessage.senderId?._id || newMessage.senderId,
        receiverId: newMessage.receiverId?._id || newMessage.receiverId,
      };
      
      console.log("Adding normalized message:", normalizedMessage);
      
      // Add new message immediately
      set((state) => {
        const updatedMessages = [...state.messages, normalizedMessage];
        console.log("Updated messages count:", updatedMessages.length);
        return { messages: updatedMessages };
      });
      
      // Only play sound if message is for current user (not sent by them)
      if (isSoundEnabled && !isFromCurrentUser) {
        const notificationSound = new Audio("/sounds/notification.mp3");
        notificationSound.currentTime = 0;
        notificationSound.play().catch((e) => console.log("Audio play failed:", e));
      }
    });
    
    console.log("✅ Socket listener set up for newMessage");

    // Listen for message viewed event (for disappearing photos)
    socket.on("messageViewed", (data) => {
      const { messageId } = data;
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id?.toString() === messageId ? { ...msg, isViewed: true, viewedAt: data.viewedAt } : msg
        ),
      }));
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
      socket.off("messageViewed");
    }
  },

  markMessageAsViewed: async (messageId) => {
    try {
      await axiosInstance.put(`/messages/view/${messageId}`);
    } catch (error) {
      console.error("Error marking message as viewed:", error);
    }
  },
}));

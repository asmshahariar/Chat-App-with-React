import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";

export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const user = await User.findById(loggedInUserId);
    
    // Get all users except current user
    const allUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    
    // Get friend requests for current user
    const friendRequests = await FriendRequest.find({
      $or: [
        { senderId: loggedInUserId, status: "pending" },
        { receiverId: loggedInUserId, status: "pending" },
      ],
    });

    // Add friend request status to each user
    const contactsWithStatus = allUsers.map((contact) => {
      const sentRequest = friendRequests.find(
        (req) => req.senderId.toString() === loggedInUserId.toString() && 
                 req.receiverId.toString() === contact._id.toString()
      );
      const receivedRequest = friendRequests.find(
        (req) => req.receiverId.toString() === loggedInUserId.toString() && 
                 req.senderId.toString() === contact._id.toString()
      );
      
      // Check if users are friends (check both arrays to be safe)
      const isFriend = user.friends && (
        user.friends.some(friendId => friendId.toString() === contact._id.toString()) ||
        user.friends.includes(contact._id)
      );

      return {
        ...contact.toObject(),
        isFriend: !!isFriend,
        friendRequestStatus: sentRequest ? "sent" : receivedRequest ? "received" : null,
        friendRequestId: sentRequest?._id?.toString() || receivedRequest?._id?.toString() || null,
      };
    });

    console.log(`Found ${contactsWithStatus.length} contacts for user ${loggedInUserId}`);
    res.status(200).json(contactsWithStatus);
  } catch (error) {
    console.error("Error in getAllContacts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("senderId", "fullName email profilePic");

    // Filter out disappearing photos that have been viewed
    const filteredMessages = messages.map((msg) => {
      const msgObj = msg.toObject ? msg.toObject() : msg;
      // If it's a disappearing photo that's been viewed, remove the image
      if (msgObj.isDisappearing && msgObj.isViewed && msgObj.image) {
        // Only hide if current user is the receiver (not the sender)
        if (msgObj.receiverId.toString() === myId.toString()) {
          msgObj.image = null;
        }
      }
      return msgObj;
    });

    res.status(200).json(filteredMessages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mark disappearing photo as viewed
export const markMessageAsViewed = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user is the receiver
    if (message.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Only mark as viewed if it's a disappearing photo and not already viewed
    if (message.isDisappearing && !message.isViewed) {
      message.isViewed = true;
      message.viewedAt = new Date();
      await message.save();

      // Emit socket event to sender that photo was viewed
      if (io) {
        const senderSocketId = getReceiverSocketId(message.senderId.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageViewed", {
            messageId: message._id.toString(),
            viewedAt: message.viewedAt,
          });
        }
      }
    }

    res.status(200).json({ message: "Message marked as viewed", message });
  } catch (error) {
    console.log("Error in markMessageAsViewed controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, imageFileName, file, fileName, fileType, fileSize } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text && !image && !file) {
      return res.status(400).json({ message: "Text, image, or file is required." });
    }
    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({ message: "Cannot send messages to yourself." });
    }
    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    // Check if users are friends
    const sender = await User.findById(senderId);
    if (!sender.friends || !sender.friends.includes(receiverId)) {
      return res.status(403).json({ message: "You must be friends to send messages." });
    }

    let imageUrl;
    let fileUrl;
    
    // Handle image upload
    if (image) {
      // Check if it's a base64 image
      if (image.startsWith('data:image')) {
        const uploadResponse = await cloudinary.uploader.upload(image, {
          folder: "chat-app/images",
          resource_type: "image",
        });
        imageUrl = uploadResponse.secure_url;
      } else {
        imageUrl = image; // Already a URL
      }
    }

    // Handle file upload (non-image files)
    if (file && !image) {
      // Validate file size (20MB = 20 * 1024 * 1024 bytes)
      const maxSize = 20 * 1024 * 1024;
      if (fileSize && fileSize > maxSize) {
        return res.status(400).json({ message: "File size must be less than 20MB" });
      }

      try {
        // Upload file to Cloudinary
        // Cloudinary supports various file types
        const uploadResponse = await cloudinary.uploader.upload(file, {
          folder: "chat-app/files",
          resource_type: "auto", // Auto-detect file type
        });
        fileUrl = uploadResponse.secure_url;
      } catch (cloudinaryError) {
        console.error("Cloudinary upload error:", cloudinaryError);
        return res.status(500).json({ message: "Failed to upload file" });
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      file: fileUrl,
      fileName: fileName || imageFileName || null, // Use imageFileName if it's an image, otherwise use fileName
      fileType: fileType || (image ? "image/jpeg" : null), // Default to image/jpeg if image but no fileType
      fileSize: fileSize || null,
      isDisappearing: req.body.isDisappearing || false,
    });

    await newMessage.save();

    // Populate sender info for socket emission
    await newMessage.populate("senderId", "fullName email profilePic");

    // Only emit socket event if io is available (not in serverless)
    if (io) {
      const receiverSocketId = getReceiverSocketId(receiverId.toString());
      if (receiverSocketId) {
        // Convert message to plain object for socket emission
        const messageObj = newMessage.toObject ? newMessage.toObject() : newMessage;
        console.log("Emitting newMessage to receiver:", receiverId.toString(), "socketId:", receiverSocketId);
        io.to(receiverSocketId).emit("newMessage", messageObj);
      } else {
        console.log("Receiver not online, cannot emit message to:", receiverId.toString());
      }
      // Also emit to sender for real-time update
      const senderSocketId = getReceiverSocketId(senderId.toString());
      if (senderSocketId) {
        const messageObj = newMessage.toObject ? newMessage.toObject() : newMessage;
        console.log("Emitting newMessage to sender:", senderId.toString(), "socketId:", senderSocketId);
        io.to(senderSocketId).emit("newMessage", messageObj);
      } else {
        console.log("Sender not online, cannot emit message to:", senderId.toString());
      }
    } else {
      console.log("Socket.io not available (serverless mode)");
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const user = await User.findById(loggedInUserId);

    // Only get friends as chat partners
    if (!user.friends || user.friends.length === 0) {
      return res.status(200).json([]);
    }

    // find all the messages where the logged-in user is either sender or receiver
    // and the other user is a friend
    const messages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    });

    const chatPartnerIds = [
      ...new Set(
        messages
          .map((msg) =>
            msg.senderId.toString() === loggedInUserId.toString()
              ? msg.receiverId.toString()
              : msg.senderId.toString()
          )
          .filter((id) => user.friends.includes(id)) // Only include friends
      ),
    ];

    if (chatPartnerIds.length === 0) {
      return res.status(200).json([]);
    }

    const chatPartners = await User.find({ _id: { $in: chatPartnerIds } }).select("-password");

    res.status(200).json(chatPartners);
  } catch (error) {
    console.error("Error in getChatPartners: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

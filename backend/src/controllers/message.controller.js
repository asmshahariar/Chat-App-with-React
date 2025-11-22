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
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text && !image) {
      return res.status(400).json({ message: "Text or image is required." });
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
    if (image) {
      // upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    // Only emit socket event if io is available (not in serverless)
    if (io) {
      const receiverSocketId = getReceiverSocketId(receiverId.toString());
      if (receiverSocketId) {
        // Convert message to plain object for socket emission
        const messageObj = newMessage.toObject ? newMessage.toObject() : newMessage;
        io.to(receiverSocketId).emit("newMessage", messageObj);
      }
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

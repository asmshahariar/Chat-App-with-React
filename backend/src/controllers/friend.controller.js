import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Send a friend request
export const sendFriendRequest = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const senderId = req.user._id;

    if (senderId.toString() === receiverId) {
      return res.status(400).json({ message: "Cannot send friend request to yourself" });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already friends
    const sender = await User.findById(senderId);
    if (sender.friends.includes(receiverId)) {
      return res.status(400).json({ message: "Already friends with this user" });
    }

    // Check if friend request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return res.status(400).json({ message: "Friend request already sent" });
      }
      if (existingRequest.status === "accepted") {
        return res.status(400).json({ message: "Already friends with this user" });
      }
    }

    // Create new friend request
    const friendRequest = new FriendRequest({
      senderId,
      receiverId,
      status: "pending",
    });

    await friendRequest.save();

    // Populate sender info for response
    await friendRequest.populate("senderId", "fullName email profilePic");
    await friendRequest.populate("receiverId", "fullName email profilePic");

    // Emit socket event to receiver if they're online
    if (io) {
      const receiverSocketId = getReceiverSocketId(receiverId.toString());
      if (receiverSocketId) {
        // Convert to plain object for socket emission
        const friendRequestObj = friendRequest.toObject ? friendRequest.toObject() : friendRequest;
        io.to(receiverSocketId).emit("newFriendRequest", friendRequestObj);
      }
    }

    res.status(201).json(friendRequest);
  } catch (error) {
    console.error("Error in sendFriendRequest:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Friend request already exists" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

// Accept a friend request
export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Check if the current user is the receiver
    if (friendRequest.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized to accept this request" });
    }

    if (friendRequest.status !== "pending") {
      return res.status(400).json({ message: "Friend request is not pending" });
    }

    // Update friend request status
    friendRequest.status = "accepted";
    await friendRequest.save();

    // Add to friends list for both users
    await User.findByIdAndUpdate(friendRequest.senderId, {
      $addToSet: { friends: friendRequest.receiverId },
    });

    await User.findByIdAndUpdate(friendRequest.receiverId, {
      $addToSet: { friends: friendRequest.senderId },
    });

    // Populate user info
    await friendRequest.populate("senderId", "fullName email profilePic");
    await friendRequest.populate("receiverId", "fullName email profilePic");

    // Emit socket events to both users to update their friend lists
    if (io) {
      const senderSocketId = getReceiverSocketId(friendRequest.senderId.toString());
      const receiverSocketId = getReceiverSocketId(friendRequest.receiverId.toString());
      
      if (senderSocketId) {
        io.to(senderSocketId).emit("friendRequestAccepted", friendRequest);
      }
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("friendRequestAccepted", friendRequest);
      }
    }

    res.status(200).json(friendRequest);
  } catch (error) {
    console.error("Error in acceptFriendRequest:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Reject a friend request
export const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Check if the current user is the receiver
    if (friendRequest.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized to reject this request" });
    }

    if (friendRequest.status !== "pending") {
      return res.status(400).json({ message: "Friend request is not pending" });
    }

    // Update friend request status
    friendRequest.status = "rejected";
    await friendRequest.save();

    // Emit socket event to sender if they're online
    if (io) {
      const senderSocketId = getReceiverSocketId(friendRequest.senderId.toString());
      if (senderSocketId) {
        const friendRequestObj = friendRequest.toObject ? friendRequest.toObject() : friendRequest;
        io.to(senderSocketId).emit("friendRequestRejected", friendRequestObj);
      }
    }

    res.status(200).json({ message: "Friend request rejected", friendRequest });
  } catch (error) {
    console.error("Error in rejectFriendRequest:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Cancel a friend request (sender cancels)
export const cancelFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Check if the current user is the sender
    if (friendRequest.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized to cancel this request" });
    }

    if (friendRequest.status !== "pending") {
      return res.status(400).json({ message: "Cannot cancel a non-pending request" });
    }

    await FriendRequest.findByIdAndDelete(requestId);

    // Emit socket event to receiver if they're online
    if (io) {
      const receiverSocketId = getReceiverSocketId(friendRequest.receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("friendRequestCancelled", {
          requestId: requestId.toString(),
          senderId: friendRequest.senderId.toString(),
        });
      }
    }

    res.status(200).json({ message: "Friend request cancelled" });
  } catch (error) {
    console.error("Error in cancelFriendRequest:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all friend requests (sent and received)
export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const friendRequests = await FriendRequest.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
      status: "pending",
    })
      .populate("senderId", "fullName email profilePic")
      .populate("receiverId", "fullName email profilePic")
      .sort({ createdAt: -1 });

    // Separate sent and received requests
    const sentRequests = friendRequests.filter(
      (req) => req.senderId._id.toString() === userId.toString()
    );
    const receivedRequests = friendRequests.filter(
      (req) => req.receiverId._id.toString() === userId.toString()
    );

    res.status(200).json({
      sent: sentRequests,
      received: receivedRequests,
    });
  } catch (error) {
    console.error("Error in getFriendRequests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all friends
export const getFriends = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).populate("friends", "fullName email profilePic");

    res.status(200).json(user.friends || []);
  } catch (error) {
    console.error("Error in getFriends:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


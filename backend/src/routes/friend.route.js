import express from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getFriendRequests,
  getFriends,
} from "../controllers/friend.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

// Get all friend requests (sent and received)
router.get("/requests", getFriendRequests);

// Get all friends
router.get("/friends", getFriends);

// Send a friend request
router.post("/request/:receiverId", sendFriendRequest);

// Accept a friend request
router.put("/accept/:requestId", acceptFriendRequest);

// Reject a friend request
router.put("/reject/:requestId", rejectFriendRequest);

// Cancel a friend request (sender cancels)
router.delete("/cancel/:requestId", cancelFriendRequest);

export default router;


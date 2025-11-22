import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Prevent duplicate friend requests
friendRequestSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });

// Prevent users from sending friend requests to themselves
friendRequestSchema.pre("save", function (next) {
  if (this.senderId.toString() === this.receiverId.toString()) {
    const error = new Error("Cannot send friend request to yourself");
    return next(error);
  }
  next();
});

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);

export default FriendRequest;


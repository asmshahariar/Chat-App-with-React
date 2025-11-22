import express from "express";
import {
  getAllContacts,
  getChatPartners,
  getMessagesByUserId,
  sendMessage,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

// the middlewares execute in order - so requests get rate-limited first, then authenticated.
// this is actually more efficient since unauthenticated requests get blocked by rate limiting before hitting the auth middleware.
// Temporarily disable arcjet to debug contacts issue
router.use(protectRoute);
// router.use(arcjetProtection, protectRoute);

// IMPORTANT: Specific routes must come before parameterized routes like /:id
// Otherwise /contacts will match /:id with id="contacts"

// Debug endpoint to test route
router.get("/test", (req, res) => {
  res.json({ message: "Messages route is working", user: req.user?._id || "No user" });
});

router.get("/contacts", getAllContacts);
router.get("/chats", getChatPartners);
router.post("/send/:id", sendMessage);
router.get("/:id", getMessagesByUserId); // This must be last to avoid catching /contacts or /chats

export default router;

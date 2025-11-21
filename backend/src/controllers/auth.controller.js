import User from "../models/User.js";
import { generateToken } from "../lib/utils.js";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "../email/emailHandlers.js";
import cloudinary from "../lib/cloudinary.js";
import mongoose from "mongoose";

import "dotenv/config";


export const signup = async (req, res) => {
    
  const { fullName, email, password } = req.body
  
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    //check if emails valid: regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const user = await User.findOne({ email});
    if (user) return res.status(400).json({ message: "User already exists" });
    
    //hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //create user
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    
    generateToken(res, newUser._id);
    
    res.status(201).json({ message: "User created successfully", user: { id: newUser._id, fullName: newUser.fullName, email: newUser.email, profilePic: newUser.profilePic } });

    try {
      const clientURL = process.env.CLIENT_URL || "http://localhost:5173";
      await sendWelcomeEmail(newUser.email, newUser.fullName, clientURL);
    } catch (error) {
      console.error("Failed to send welcome email:", error);
    }

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      console.log("Database not connected. Attempting to connect... State:", mongoose.connection.readyState);
      try {
        // Try to connect if not connected
        if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
          const mongoUri = process.env.MONGO_URI;
          if (!mongoUri) {
            console.error("MONGO_URI is not set");
            return res.status(500).json({ message: "Server configuration error. Please contact support." });
          }
          await mongoose.connect(mongoUri, {
            dbName: 'chat_db'
          });
          console.log("Database connected successfully");
        }
      } catch (dbError) {
        console.error("Database connection error:", dbError);
        return res.status(500).json({ 
          message: "Database connection error. Please try again.",
          error: process.env.NODE_ENV === "development" ? dbError.message : undefined
        });
      }
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    generateToken(res, user._id);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic || "",
    });

  } catch (error) {
    console.error("Login error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      message: "Internal server error", 
      error: process.env.NODE_ENV === "development" ? error.message : "An error occurred during login" 
    });
  }
};


export const logout = (_, res) => {
  res.cookie("jwt", "", { maxAge: 0 });
  res.status(200).json({ message: "Logged out successfully" });
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    if (!profilePic) return res.status(400).json({ message: "Profile pic is required" });

    const userId = req.user._id;

    // Upload base64 image to Cloudinary
    let imageUrl = profilePic;
    
    // If it's a base64 string, upload to Cloudinary
    if (profilePic.startsWith('data:image')) {
      // Check if Cloudinary is configured
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.warn("Cloudinary not configured, storing base64 directly (not recommended for production)");
        // Store base64 directly as fallback (not ideal but works)
        imageUrl = profilePic;
      } else {
        try {
          const uploadResponse = await cloudinary.uploader.upload(profilePic, {
            folder: "chat-app/profile-pics",
            resource_type: "image",
          });
          imageUrl = uploadResponse.secure_url;
          console.log("Image uploaded to Cloudinary:", imageUrl);
        } catch (cloudinaryError) {
          console.error("Cloudinary upload error:", cloudinaryError);
          // Fallback: store base64 directly if Cloudinary fails
          console.warn("Falling back to base64 storage");
          imageUrl = profilePic;
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: imageUrl },
      { new: true }
    ).select("-password"); // Exclude password from response

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Profile updated, profilePic:", updatedUser.profilePic);

    res.status(200).json({
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      profilePic: updatedUser.profilePic,
    });
  } catch (error) {
    console.error("Error in update profile:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


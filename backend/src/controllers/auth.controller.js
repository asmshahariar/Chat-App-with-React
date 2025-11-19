import User from "../models/User.js";
import { generateToken } from "../lib/utils.js";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "../email/emailHandlers.js";




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


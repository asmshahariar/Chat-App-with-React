import jwt from "jsonwebtoken";
import { ENV } from "./env.js";

export const generateToken = (res, userId) => {

  const { JWT_SECRET } = ENV;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }
  
  const token = jwt.sign({userId}, JWT_SECRET, {expiresIn: "15d"})
  
  res.cookie("jwt", token, {
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
    httpOnly: true, //prevent XSS attacks: cross-site scripting
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", // "none" for cross-origin in production
    secure: process.env.NODE_ENV === "production" ? true : false, 
    domain: process.env.NODE_ENV === "production" ? undefined : undefined, // Let browser set domain
  })

  return token;
};

// http://localhost
// https://dsmakmk.com

import jwt from "jsonwebtoken";

export const generateToken = (res, userId) => {
  
  const token = jwt.sign({userId}, process.env.JWT_SECRET, {expiresIn: "15d"})
  
  res.cookie("jwt", token, {
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
    httpOnly: true, //prevent XSS attacks: cross-site scripting
    sameSite: "strict", //prevent CSRF attacks: cross-site request forgery
    secure: process.env.NODE_ENV === "development" ? false : true, 
  })

  return token;
};

// http://localhost
// https://dsmakmk.com

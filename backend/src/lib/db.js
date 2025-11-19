import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'chat_db'
    });
    console.log("MONGODB CONNECTED:", conn.connection.host);
    console.log("DATABASE NAME:", conn.connection.name);
  } catch (error) {
    console.error("Error connection to MONGODB:", error);
    process.exit(1); // 1 status code means fail, 0 means success
  }
};

import express from "express";
import dotenv from "dotenv";
import userRoute from "./route/user.js";
import chatRoute from "./route/chat.js";
import adminRoute from "./route/admin.js";
import connectDatabase from "./utils/config/database.js";
import { errorMiddleware } from "./middleware/error.js";
import { app, server } from "./socketio/socket.js";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import { corsOption } from "./constant/config.js";

dotenv.config();

const adminSecretKey = process.env.SECRET_KEY;
const PORT = process.env.PORT || 3000;
const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

app.use(express.json());

// app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/", (req, res) => {
  res.send("MERN PROJECT Chat App Backend");
});

app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);

app.use(errorMiddleware);

server.listen(PORT, () => {
  connectDatabase();
  console.log(`Server listening on Port: ${PORT} in ${envMode} Mode `);
});

export { adminSecretKey, envMode };

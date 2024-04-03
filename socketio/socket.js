import { Server } from "socket.io";
import http from "http";
import express from "express";
import {
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  START_TYPING,
  STOP_TYPING,
  USER_OFFLINE,
  USER_ONLINE,
} from "../constant/events.js";
import { v4 as uuid } from "uuid";
import { getSockets } from "../lib/helper.js";
import { Message } from "../model/messageModel.js";
import { corsOption } from "../constant/config.js";
import cookieParser from "cookie-parser";
import { socketAuthenticated } from "../middleware/auth.js";

const app = express();
app.use(cookieParser());

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOption,
});

app.set("io", io);

const userSocketId = new Map();
const onlineUsers = new Set();

io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthenticated(err, socket, next)
  );
});
io.on("connection", (socket) => {
  // console.log("User Connected");
  const user = socket.user;
  userSocketId.set(user._id.toString(), socket.id);

  // console.log(user.name, "Connected");

  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    const realTimeMessage = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };
    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };
    // console.log("Emitting", realTimeMessage);
    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: realTimeMessage,
    });
    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });
    try {
      await Message.create(messageForDB);
    } catch (error) {
      throw new Error(error)
    }
  });

  socket.on(START_TYPING, ({ members, chatId }) => {
    // console.log("start-typing...", chatId);
    const membersSocket = getSockets(members);
    socket.to(membersSocket).emit(START_TYPING, { chatId });
  });

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    // console.log("stop-typing...", chatId);
    const membersSocket = getSockets(members);
    socket.to(membersSocket).emit(STOP_TYPING, { chatId });
  });

  socket.on(USER_ONLINE, ({ userId, members }) => {
    onlineUsers.add(userId.toString());
    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
    // console.log("user-online", userId);
  });

  socket.on(USER_OFFLINE, ({ userId, members }) => {
    onlineUsers.delete(userId.toString());
    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
    // console.log("user-offline", userId);
  });

  socket.on("disconnect", () => {
    // console.log("User disconnected");
    userSocketId.delete(user._id.toString());
    onlineUsers.delete(user._id.toString());
    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });
});

export { app, server, io, userSocketId };

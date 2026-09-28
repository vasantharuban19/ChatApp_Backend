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
  MESSAGE_DELIVERED,
  MESSAGE_READ,
} from "../constant/events.js";

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

// ======================================================
// SOCKET AUTHENTICATION
// ======================================================

io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res, async (err) => {
    await socketAuthenticated(err, socket, next);
  });
});

// ======================================================
// CONNECTION
// ======================================================

io.on("connection", (socket) => {
  const user = socket.user;
  const userId = user._id.toString();

  userSocketId.set(userId, socket.id);
  onlineUsers.add(userId);

  console.log(`User connected: ${user.name}`);

  // ======================================================
  // NEW MESSAGE
  // ======================================================

  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    try {
      if (!chatId || !message?.trim()) return;

      const messageForDB = {
        content: message.trim(),
        sender: user._id,
        chat: chatId,

        // Sender has already received/sent the message
        deliveredTo: [user._id],

        readBy: [user._id],
      };

      // Save FIRST
      const savedMessage = await Message.create(messageForDB);

      const realTimeMessage = {
        _id: savedMessage._id,

        content: savedMessage.content,

        sender: {
          _id: user._id,
          name: user.name,
        },

        chat: chatId,

        createdAt: savedMessage.createdAt,

        deliveredTo: savedMessage.deliveredTo,

        readBy: savedMessage.readBy,
      };

      const membersSocket = getSockets(members);

      // Send message to everyone
      io.to(membersSocket).emit(NEW_MESSAGE, {
        chatId,
        message: realTimeMessage,
      });

      // Notification
      io.to(membersSocket).emit(NEW_MESSAGE_ALERT, {
        chatId,
      });
    } catch (error) {
      console.error("NEW_MESSAGE error:", error);
    }
  });

  // ======================================================
  // MESSAGE DELIVERED
  // ======================================================

  socket.on(MESSAGE_DELIVERED, async ({ messageId, senderId, chatId }) => {
    try {
      if (!messageId || !senderId || !chatId) return;

      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        {
          $addToSet: {
            deliveredTo: user._id,
          },
        },
        {
          new: true,
        },
      );

      if (!updatedMessage) return;

      // Find sender's socket
      const senderSocket = userSocketId.get(senderId.toString());

      if (!senderSocket) return;

      // Tell sender
      io.to(senderSocket).emit(MESSAGE_DELIVERED, {
        messageId,
        userId: user._id.toString(),
        chatId,
      });
    } catch (error) {
      console.error("MESSAGE_DELIVERED error:", error);
    }
  });

  // ======================================================
  // MESSAGE READ
  // ======================================================

  socket.on(MESSAGE_READ, async ({ messageId, senderId, chatId }) => {
    try {
      if (!messageId || !senderId || !chatId) return;

      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        {
          $addToSet: {
            readBy: user._id,
          },
        },
        {
          new: true,
        },
      );

      if (!updatedMessage) return;

      const senderSocket = userSocketId.get(senderId.toString());

      if (!senderSocket) return;

      // Tell sender that message was read
      io.to(senderSocket).emit(MESSAGE_READ, {
        messageId,
        userId: user._id.toString(),
        chatId,
      });
    } catch (error) {
      console.error("MESSAGE_READ error:", error);
    }
  });

  // ======================================================
  // START TYPING
  // ======================================================

  socket.on(START_TYPING, ({ members, chatId }) => {
    if (!members || !chatId) return;

    const membersSocket = getSockets(members);

    socket.to(membersSocket).emit(START_TYPING, {
      chatId,
    });
  });

  // ======================================================
  // STOP TYPING
  // ======================================================

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    if (!members || !chatId) return;

    const membersSocket = getSockets(members);

    socket.to(membersSocket).emit(STOP_TYPING, {
      chatId,
    });
  });

  // ======================================================
  // USER ONLINE
  // ======================================================

  socket.on(USER_ONLINE, ({ userId, members }) => {
    if (!userId) return;

    const currentUserId = userId.toString();

    onlineUsers.add(currentUserId);

    const membersSocket = getSockets(members);

    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  // ======================================================
  // USER OFFLINE
  // ======================================================

  socket.on(USER_OFFLINE, ({ userId, members }) => {
    if (!userId) return;

    const currentUserId = userId.toString();

    onlineUsers.delete(currentUserId);

    const membersSocket = getSockets(members);

    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  // ======================================================
  // DISCONNECT
  // ======================================================

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${user.name}`);

    if (userSocketId.get(userId) === socket.id) {
      userSocketId.delete(userId);
      onlineUsers.delete(userId);
    }

    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });
});

export { app, server, io, userSocketId };

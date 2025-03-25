import jwt from "jsonwebtoken";
import { Chat } from "../model/chatModel .js";
import { Message } from "../model/messageModel.js";
import { User } from "../model/userModel.js";
import { ErrorHandler } from "../utils/utility.js";
import { adminSecretKey } from "../app.js";

const adminLogin = async (req, res, next) => {
  try {
    const { secretKey } = req.body;

    if (secretKey !== adminSecretKey) {
      return next(new ErrorHandler("Invalid Secret Key", 401));
    }

    const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
      expiresIn: "15d",
    });

    return res
      .status(200)
      .cookie("jwt-admin", token, {
        maxAge: 15 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "none",
        secure: process.env.NODE_ENV === "PRODUCTION",
      })
      .json({
        success: true,
        message: "Login successfully, Welcome Admin",
        token,
      });
  } catch (error) {
    next(error);
  }
};

const adminLogout = async (req, res, next) => {
  try {
    return res
      .status(200)
      .cookie("jwt-admin", "", {
        expires: new Date(0),
        maxAge: 0,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "PRODUCTION" ? "none" : "lax",
        secure: process.env.NODE_ENV === "PRODUCTION",
      })
      .json({
        success: true,
        message: "Logout successfully",
      });
  } catch (error) {
    next(error);
  }
};

const getAdmindata = async (req, res, next) => {
  try {
    return res.status(200).json({
      admin: true,
    });
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({});

    const transformedUsers = await Promise.all(
      users.map(async ({ _id, name, username, avatar }) => {
        const [groups, friends] = await Promise.all([
          Chat.countDocuments({ groupChat: true, members: _id }),
          Chat.countDocuments({ groupChat: false, members: _id }),
        ]);

        return {
          _id,
          name,
          username,
          groups,
          friends,
          avatar: avatar.url,
        };
      })
    );

    res.status(200).json({
      success: true,
      users: transformedUsers,
    });
  } catch (error) {
    next(error);
  }
};

const getAllChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({})
      .populate("members", "name avatar")
      .populate("creator", "name avatar");

    const transformedChats = await Promise.all(
      chats.map(async ({ _id, name, members, groupChat, creator }) => {
        const totalMessages = await Message.countDocuments({ chat: _id });

        return {
          _id,
          name,
          groupChat,
          avatar: members.slice(0, 3).map((member) => member.avatar.url),
          members: members.map(({ _id, name, avatar }) => ({
            _id,
            name,
            avatar: avatar.url,
          })),
          creator: {
            name: creator?.name || "None",
            avatar: creator?.avatar.url || "",
          },
          totalMembers: members.length,
          totalMessages,
        };
      })
    );

    res.status(200).json({
      success: true,
      chats: transformedChats,
    });
  } catch (error) {
    next(error);
  }
};

const getAllMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({})
      .populate("sender", "name avatar")
      .populate("chat", " groupChat");

    const transformedMessages = messages.map(
      ({ _id, content, attachments, sender, createdAt, chat }) => ({
        _id,
        attachments,
        content,
        createdAt,
        chat: chat?._id,
        groupChat: chat?.groupChat,
        sender: {
          _id: sender?._id,
          name: sender?.name,
          avatar: sender?.avatar.url,
        },
      })
    );

    return res.status(200).json({
      success: true,
      messages: transformedMessages,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const [userCount, groupsCount, messagesCount, totalChatsCount] =
      await Promise.all([
        User.countDocuments(),
        Chat.countDocuments({ groupChat: true }),
        Message.countDocuments(),
        Chat.countDocuments(),
      ]);

    const today = new Date();

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const last7DaysMessages = await Message.find({
      createdAt: {
        $gte: last7Days,
        $lte: today,
      },
    }).select("createdAt");

    const messages = new Array(7).fill(0);

    last7DaysMessages.forEach((message) => {
      const indexApprox =
        (today.getTime() - message.createdAt.getTime()) / (1000 * 60 * 60 * 24);

      const index = Math.floor(indexApprox);

      messages[6 - index]++;
    });

    const stats = {
      userCount,
      groupsCount,
      messagesCount,
      totalChatsCount,
      messagesChart: messages,
    };

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

export {
  adminLogin,
  adminLogout,
  getAdmindata,
  getAllUsers,
  getAllChats,
  getAllMessages,
  getDashboardStats,
};

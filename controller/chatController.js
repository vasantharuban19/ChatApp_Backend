import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../model/chatModel .js";
import {
  deleteFilesFromCloudinary,
  emitEvent,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import {
  ALERT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constant/events.js";
import { getOtherMember } from "../lib/helper.js";
import { User } from "../model/userModel.js";
import { Message } from "../model/messageModel.js";

const newGroupChat = async (req, res, next) => {
  try {
    const { name, members } = req.body;

    const allMembers = [...members, req.user];

    await Chat.create({
      name,
      groupChat: true,
      creator: req.user,
      members: allMembers,
    });
    
    emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);
    emitEvent(req, REFETCH_CHATS, members);

    return res.status(201).json({
      success: true,
      message: "Group Created Successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getMyChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ members: req.user }).populate(
      "members",
      "name avatar"
    );

    const transformedChats = chats.map(({ _id, name, members, groupChat }) => {
      const otherMember = getOtherMember(members, req.user);

      return {
        _id,
        groupChat,
        avatar: groupChat
          ? members.slice(0, 3).map(({ avatar }) => avatar.url)
          : [otherMember.avatar.url],
        name: groupChat ? name : otherMember.name,
        members: members.reduce((prev, curr) => {
          if (curr._id.toString() !== req.user.toString()) {
            prev.push(curr._id);
          }
          return prev;
        }, []),
      };
    });

    return res.status(200).json({
      success: true,
      chats: transformedChats,
    });
  } catch (error) {
    next(error);
  }
};

const getMyGroups = async (req, res, next) => {
  try {
    const chats = await Chat.find({
      members: req.user,
      groupChat: true,
      creator: req.user,
    }).populate("members", "name avatar");

    const groups = chats.map(({ members, _id, groupChat, name }) => ({
      _id,
      groupChat,
      name,
      avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
    }));

    return res.status(200).json({
      success: true,
      groups,
    });
  } catch (error) {
    next(error);
  }
};

const addMembers = async (req, res, next) => {
  try {
    const { chatId, members } = req.body;

    const chat = await Chat.findById(chatId);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    if (!chat.groupChat)
      return next(new ErrorHandler("This is not a Group Chat", 404));

    if (chat.creator.toString() !== req.user.toString())
      return next(new ErrorHandler("Only Creator can Add Members", 403));
    const allNewMembersPromise = members.map((i) => User.findById(i, "name"));

    const allNewMembers = await Promise.all(allNewMembersPromise);

    const uniqueMembers = allNewMembers
      .filter((i) => !chat.members.includes(i._id.toString()))
      .map((i) => i._id);
    chat.members.push(...uniqueMembers);

    if (chat.members.length > 50)
      return next(new ErrorHandler("Group Members Limit Reached", 400));

    await chat.save();
    const allUsersName = allNewMembers.map((i) => i.name).join(", ");

    emitEvent(
      req,
      ALERT,
      chat.members,
      `${allUsersName} has been added in the Group`
    );
    emitEvent(req, REFETCH_CHATS, chat.members);

    return res.status(200).json({
      success: true,
      message: "Members added successfully",
    });
  } catch (error) {
    next(error);
  }
};

const removeMembers = async (req, res, next) => {
  try {
    const { userId, chatId } = req.body;

    const [chat, userRemoved] = await Promise.all([
      Chat.findById(chatId),
      User.findById(userId, "name"),
    ]);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    if (!chat.groupChat)
      return next(new ErrorHandler("This is not a Group Chat", 404));

    if (chat.creator.toString() !== req.user.toString())
      return next(new ErrorHandler("Only Creator can Add Members", 403));

    if (chat.members.length <= 3)
      return next(new ErrorHandler("Group must have atleast 3 members", 400));

    const allChatMembers = chat.members.map((i) => i.toString());

    chat.members = chat.members.filter(
      (member) => member.toString() !== userId.toString()
    );
    await chat.save();

    emitEvent(req, ALERT, chat.members, {
      message: `${userRemoved.name} has been removed from the Group`,
      chatId,
    });
    emitEvent(req, REFETCH_CHATS, allChatMembers);

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

const leaveGroup = async (req, res, next) => {
  try {
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    if (!chat.groupChat)
      return next(new ErrorHandler("This is not a Group Chat", 404));

    const remainingMembers = chat.members.filter(
      (member) => member.toString() !== req.user.toString()
    );

    if (remainingMembers.length < 3)
      return next(new ErrorHandler("Group must have atleast 3 members", 400));

    if (chat.creator.toString() === req.user.toString()) {
      const randomNumber = Math.floor(Math.random() * remainingMembers.length);
      const newCreator = remainingMembers[randomNumber];
      chat.creator = newCreator;
    }
    chat.members = remainingMembers;

    const [user] = await Promise.all([
      User.findById(req.user, "name"),
      chat.save(),
    ]);

    emitEvent(req, ALERT, chat.members, {
      chatId,
      message: `User ${user.name} has left the Group`,
    });

    return res.status(200).json({
      success: true,
      message: "You leaved this group",
    });
  } catch (error) {
    next(error);
  }
};

const sendAttachments = async (req, res, next) => {
  try {
    const { chatId } = req.body;

    const files = req.files || [];

    if (files.length < 1)
      return next(new ErrorHandler("Please provide attachments", 400));

    if (files.length > 5)
      return next(
        new ErrorHandler("You can't send more than 5 attachments", 400)
      );

    const [chat, me] = await Promise.all([
      Chat.findById(chatId),
      User.findById(req.user, "name"),
    ]);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    if (files.length < 1)
      return next(new ErrorHandler("Please provide attachments", 400));

    //   Upload files
    const attachments = await uploadFilesToCloudinary(files);

    const messageForDB = {
      content: "",
      attachments,
      sender: me._id,
      chat: chatId,
    };

    const messageForrealTime = {
      ...messageForDB,
      sender: {
        _id: me._id,
        name: me.name,
      },
    };

    const message = await Message.create(messageForDB);

    emitEvent(req, NEW_MESSAGE, chat.members, {
      message: messageForrealTime,
      chatId,
    });
    emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    next(error);
  }
};

const getChatDetails = async (req, res, next) => {
  try {
    if (req.query.populate === "true") {
      const chat = await Chat.findById(req.params.id)
        .populate("members", "name avatar")
        .lean();

      if (!chat) return next(new ErrorHandler("Chat not found", 404));

      chat.members = chat.members.map(({ _id, name, avatar }) => ({
        _id,
        name,
        avatar: avatar.url,
      }));

      return res.status(200).json({
        success: true,
        chat,
      });
    } else {
      const chat = await Chat.findById(req.params.id);
      if (!chat) return next(new ErrorHandler("Chat not found", 404));
      return res.status(200).json({
        success: true,
        chat,
      });
    }
  } catch (error) {
    next(error);
  }
};

const renameGroup = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const { name } = req.body;

    const chat = await Chat.findById(chatId);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    if (!chat.groupChat)
      return next(new ErrorHandler("This is not a group chat", 404));

    if (chat.creator.toString() !== req.user.toString())
      return next(new ErrorHandler("Only Creator can Rename the Group", 403));

    chat.name = name;
    await chat.save();

    emitEvent(req, REFETCH_CHATS, chat.members);

    res.status(200).json({
      success: true,
      message: "Group renamed successfully",
    });
  } catch (error) {
    next(error);
  }
};

const deleteChat = async (req, res, next) => {
  try {
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    const members = chat.members;

    if (chat.groupChat && chat.creator.toString() !== req.user.toString())
      return next(new ErrorHandler("Only Creator can delete this Chat", 403));

    if (!chat.groupChat && !chat.members.includes(req.user.toString())) {
      return next(new ErrorHandler("Only Creator can delete this Chat", 403));
    }

    //    here we delete all messages attachments or files in cloudinary

    const messagesWithAttachments = await Message.find({
      chat: chatId,
      attachments: { $exists: true, $ne: [] },
    });

    const public_ids = [];

    messagesWithAttachments.forEach(({ attachments }) =>
      attachments.forEach(({ public_id }) => public_ids.push(public_id))
    );
    await Promise.all([
      // delete Files form cloudinary
      deleteFilesFromCloudinary(public_ids),
      chat.deleteOne(),
      Message.deleteMany({ chat: chatId }),
    ]);

    emitEvent(req, REFETCH_CHATS, members);

    res.status(200).json({
      success: true,
      message: "Chat deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const { page = 1 } = req.query;
    const resultPerPage = 20;
    const skip = (page - 1) * resultPerPage;

    const chat = await Chat.findById(chatId);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    if (!chat.members.includes(req.user.toString()))
      return next(
        new ErrorHandler(
          "You are not allowed to access this chat.Please go back and Reload",
          403
        )
      );

    const [messages, totalMessagesCount] = await Promise.all([
      Message.find({ chat: chatId })
        .skip(skip)
        .limit(resultPerPage)
        .sort({ createdAt: -1 })
        .populate("sender", "name")
        .lean(),
      Message.countDocuments({ chat: chatId }),
    ]);
    const totalPages = Math.ceil(totalMessagesCount / resultPerPage || 0);

    res.status(200).json({
      success: true,
      messages: messages.reverse(),
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

export {
  newGroupChat,
  getMyChats,
  getMyGroups,
  addMembers,
  removeMembers,
  leaveGroup,
  sendAttachments,
  getChatDetails,
  renameGroup,
  deleteChat,
  getMessages,
};

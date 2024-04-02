import express from "express";
import {
  addMembers,
  deleteChat,
  getChatDetails,
  getMessages,
  getMyChats,
  getMyGroups,
  leaveGroup,
  newGroupChat,
  removeMembers,
  renameGroup,
  sendAttachments,
} from "../controller/chatController.js";
import { isAuthenticated } from "../middleware/auth.js";
import { attachmentMulter } from "../middleware/multer.js";
import {
  addMembersValidator,
  chatIdValidator,
  newGroupValidator,
  removeMembersValidator,
  renameValidator,
  sendAttachmentsValidator,
  validate,
} from "../lib/validators.js";

const app = express.Router();

// Auth login to access the routes
app.use(isAuthenticated);

app.post("/new", newGroupValidator(), validate, newGroupChat);

app.get("/my", getMyChats);

app.get("/my/groups", getMyGroups);

app.put("/addmembers", addMembersValidator(), validate, addMembers);

app.put("/removemember", removeMembersValidator(), validate, removeMembers);

app.delete("/leave/:id", chatIdValidator(), validate, leaveGroup);

// send images
app.post(
  "/message",
  attachmentMulter,
  sendAttachmentsValidator(),
  validate,
  sendAttachments
);

// get messages
app.get("/message/:id", chatIdValidator(), validate, getMessages);

// getChatDetails, rename, delete
app
  .route("/:id")
  .get(chatIdValidator(), validate, getChatDetails)
  .put(renameValidator(), validate, renameGroup)
  .delete(chatIdValidator(), validate, deleteChat);

export default app;

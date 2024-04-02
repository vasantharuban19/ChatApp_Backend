import express from "express";
import {
  adminLogin,
  adminLogout,
  getAdmindata,
  getAllChats,
  getAllMessages,
  getAllUsers,
  getDashboardStats,
} from "../controller/adminController.js";
import { adminLoginValidator, validate } from "../lib/validators.js";
import { adminOnly } from "../middleware/auth.js";

const app = express.Router();

app.post("/login", adminLoginValidator(), validate, adminLogin);

app.get("/logout", adminLogout);

// only admin can access this routes
app.use(adminOnly);

app.get("/", getAdmindata);

app.get("/users", getAllUsers);

app.get("/chats", getAllChats);

app.get("/messages", getAllMessages);

app.get("/stats", getDashboardStats);

export default app;

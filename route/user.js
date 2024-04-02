import express from "express";
import {
  acceptFriendRequest,
  getMyFriends,
  getMyNotifications,
  getMyProfile,
  login,
  logout,
  searchUser,
  sendFriendRequest,
  signup,
} from "../controller/userController.js";
import { singleAvatar } from "../middleware/multer.js";
import { isAuthenticated } from "../middleware/auth.js";
import {
  acceptRequestValidator,
  loginValidator,
  sendRequestValidator,
  signupValidator,
  validate,
} from "../lib/validators.js";

const app = express.Router();

app.post("/signup", singleAvatar, signupValidator(), validate, signup);

app.post("/login", loginValidator(), validate, login);

// Auth login to access the routes
app.use(isAuthenticated);

app.get("/me", getMyProfile);

app.get("/logout", logout);

app.get("/search", searchUser);

app.put("/sendrequest", sendRequestValidator(), validate, sendFriendRequest);

app.put(
  "/acceptrequest",
  acceptRequestValidator(),
  validate,
  acceptFriendRequest
);

app.get("/notifications", getMyNotifications);

app.get("/friends", getMyFriends);


export default app;

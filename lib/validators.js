import { body, param, validationResult } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

const validate = (req, res, next) => {
  const errors = validationResult(req);

  const errorMessages = errors
    .array()
    .map((error) => error.msg)
    .join(", ");

  if (errors.isEmpty()) return next();
  else next(new ErrorHandler(errorMessages, 400));
};

const signupValidator = () => [
  body("name", "Name is Required").notEmpty(),
  body("username", "Username is Required").notEmpty(),
  body("bio", "Bio is Required").notEmpty(),
  body("password", "Password is Required").notEmpty(),
];

const loginValidator = () => [
  body("username", "Username is Required").notEmpty(),
  body("password", "Password is Required").notEmpty(),
];

const newGroupValidator = () => [
  body("name", "Name is Required").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Members are required")
    .isArray({ min: 2, max: 50 })
    .withMessage("Members must be between 2-50"),
];

const addMembersValidator = () => [
  body("chatId", "Chat ID is Required").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Members are required")
    .isArray({ min: 1, max: 47 })
    .withMessage("Members must be between 1-47"),
];

const removeMembersValidator = () => [
  body("chatId", "Chat ID is Required").notEmpty(),
  body("userId", "User ID is Required").notEmpty(),
];

const sendAttachmentsValidator = () => [
  body("chatId", "Chat ID is Required").notEmpty(),
];

const chatIdValidator = () => [param("id", "Chat ID is Required").notEmpty()];

const renameValidator = () => [
  param("id", "Chat ID is Required").notEmpty(),
  body("name", "New name is required").notEmpty(),
];

const sendRequestValidator = () => [
  body("userId", "User ID is required").notEmpty(),
];

const acceptRequestValidator = () => [
  body("requestId", "Request ID is required").notEmpty(),
  body("accept")
    .notEmpty()
    .withMessage("Please Add Accept")
    .isBoolean()
    .withMessage("Accept must be a boolean"),
];

const adminLoginValidator = () => [
  body("secretKey", "Secret Key is required").notEmpty(),
];

export {
  acceptRequestValidator,
  addMembersValidator,
  adminLoginValidator,
  chatIdValidator,
  loginValidator,
  newGroupValidator,
  removeMembersValidator,
  renameValidator,
  sendAttachmentsValidator,
  sendRequestValidator,
  signupValidator,
  validate,
};

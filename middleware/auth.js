import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { User } from "../model/userModel.js";

const isAuthenticated = async (req, res, next) => {
  try {
    const token = req.cookies["jwt"];

    if (!token) {
      return next(new ErrorHandler("Please login to access", 401));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return next(new ErrorHandler("Unauthorized - Invalid Token", 401));
    }

    req.user = decoded._id;

    next();
  } catch (error) {
    next(error);
  }
};

const adminOnly = async (req, res, next) => {
  try {
    const token = req.cookies["jwt-admin"];

    if (!token) {
      return next(
        new ErrorHandler("Unauthorized - Only Admin can Access", 401)
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || decoded.role !== "admin") {
      return next(new ErrorHandler("Unauthorized - Invalid Token", 401));
    }

    req.user = decoded;

    next();
  } catch (error) {
    next(error);
  }
};

const socketAuthenticated = async (err, socket, next) => {
  try {
    if (err) return next(err);

    const authToken = socket.request.cookies["jwt"];

    if (!authToken)
      return next(new ErrorHandler("Please login to access", 401));

    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);

    const user = await User.findById(decoded._id);

    if (!user) return next(new ErrorHandler("Please login to access", 401));

    socket.user = user;

    return next();
  } catch (error) {
    next(error);
    return next(new ErrorHandler("Please login to access", 401));
  }
};

export { isAuthenticated, adminOnly, socketAuthenticated };

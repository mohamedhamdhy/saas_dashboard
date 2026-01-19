import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, Role } from "../../../models/index";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { generateTokens } from "../../utils/token";
import { sendResponse } from "../../utils/sendResponse";

const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret";

export const refreshToken = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const incomingRefreshToken = req.cookies.refreshToken;

  if (!incomingRefreshToken) {
    return next(new AppError("No refresh token provided. Please log in.", 401));
  }

  let decoded: any;
  try {
    decoded = jwt.verify(incomingRefreshToken, REFRESH_SECRET);
  } catch (err) {
    return next(new AppError("Invalid or expired refresh token.", 401));
  }

  const user = await User.findByPk(decoded.id, {
    include: [{ model: Role, as: "role", attributes: ["name"] }]
  });

  if (!user) {
    return next(new AppError("User no longer exists.", 401));
  }

  if (user.tokenVersion !== decoded.tokenVersion) {
    res.clearCookie("refreshToken");
    return next(new AppError("Security Alert: This session has been revoked. Please log in again.", 401));
  }

  if (user.refreshToken !== incomingRefreshToken) {
    return next(new AppError("Session expired or hijacked. Please log in again.", 401));
  }

  const tokens = generateTokens(user);

  user.refreshToken = tokens.refreshToken;
  await user.save();

  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  sendResponse(res, 200, "Token refreshed successfully", {
    accessToken: tokens.accessToken
  });
});
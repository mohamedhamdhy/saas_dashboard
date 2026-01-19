import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { User, Role, Organization } from "../../../models/index";
import { AuthRequest } from "../../middleware/auth.middleware";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import { logSecurityEvent } from "../../utils/logger";
import { generateTokens } from "../../utils/token";
import { sendResponse } from "../../utils/sendResponse";

export const getMe = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = await User.findByPk(req.user?.id, {
    include: [
      { model: Role, as: "role", attributes: ["name"] },
      { model: Organization, as: "organization", attributes: ["name", "isActive"] }
    ]
  });

  if (!user) return next(new AppError("User not found", 404));

  sendResponse(res, 200, "User profile retrieved successfully", { user });
});

export const updateMe = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const allowedFields = ["name", "email", "phoneNumber"];
  const filteredBody: any = {};

  Object.keys(req.body).forEach((el) => {
    if (allowedFields.includes(el)) filteredBody[el] = req.body[el];
  });

  if (Object.keys(filteredBody).length === 0) {
    return next(new AppError("No valid fields provided for update.", 400));
  }

  const user = await User.findByPk(req.user?.id);
  if (!user) return next(new AppError("User not found", 404));

  await user.update(filteredBody);

  sendResponse(res, 200, "Profile updated successfully", { user });
});

export const updateMyPassword = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findByPk(req.user?.id);
  if (!user) return next(new AppError("User not found", 404));

  const isCorrect = await bcrypt.compare(currentPassword, user.password);
  if (!isCorrect) {
    await logSecurityEvent(req, "PASSWORD_CHANGE_FAILED", user.id);
    return next(new AppError("Current password is incorrect", 401));
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();

  const { accessToken, refreshToken } = generateTokens(user);
  user.refreshToken = refreshToken;
  await user.save();

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  await logSecurityEvent(req, "PASSWORD_CHANGE_SUCCESS", user.id);

  sendResponse(res, 200, "Password updated successfully. Other sessions have been invalidated.", {
    accessToken
  });
});
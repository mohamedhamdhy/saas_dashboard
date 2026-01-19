import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { User, Role, Organization } from "../../../models";
import { Session } from "../../../models/session";
import { AuthRequest } from "../../middleware/auth.middleware";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import { logSecurityEvent } from "../../utils/logger";
import { sendResponse } from "../../utils/sendResponse";

export const getAllUsers = catchAsync(async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const whereClause: any = {};

  if (req.user?.roleName !== "SUPER_ADMIN") {
    whereClause.organizationId = req.user?.organizationId;
  }

  const users = await User.findAll({
    where: whereClause,
    include: [{ model: Role, as: "role", attributes: ["name"] }]
  });

  await logSecurityEvent(req, "USER_LIST_VIEWED", req.user?.id, { count: users.length });

  sendResponse(res, 200, "Users retrieved successfully", users);
});

export const getMe = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = await User.findByPk(req.user?.id, {
    include: [
      { model: Role, as: "role", attributes: ["name"] },
      { model: Organization, as: "organization", attributes: ["name"] }
    ]
  });

  if (!user) return next(new AppError("User not found", 404));

  sendResponse(res, 200, "Current user profile retrieved", { user });
});

export const updateMe = catchAsync(async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const user = await User.findByPk(req.user?.id);
  if (!user) return _next(new AppError("User not found", 404));

  await user.update(req.body);
  await logSecurityEvent(req, "PROFILE_UPDATED", user.id);

  sendResponse(res, 200, "Profile updated successfully", { user });
});

export const updateMyPassword = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findByPk(req.user?.id);

  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    await logSecurityEvent(req, "PASSWORD_CHANGE_FAILED", req.user?.id);
    return next(new AppError("Incorrect current password", 401));
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();
  await user.save();

  await logSecurityEvent(req, "PASSWORD_CHANGE_SUCCESS", user.id);

  sendResponse(res, 200, "Password updated successfully. Existing sessions invalidated.");
});

export const getActiveSessions = catchAsync(async (req: AuthRequest, res: Response) => {
  const sessions = await Session.findAll({
    where: { userId: req.user?.id },
    limit: 5,
    order: [["createdAt", "DESC"]]
  });

  sendResponse(res, 200, "Active sessions retrieved", sessions);
});

export const revokeAllSessions = catchAsync(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const user = await User.findByPk(userId);
  if (user) {
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
  }

  await Session.destroy({ where: { userId } });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });

  await logSecurityEvent(req, "ALL_SESSIONS_REVOKED", userId);

  sendResponse(res, 200, "All sessions have been terminated successfully.");
});
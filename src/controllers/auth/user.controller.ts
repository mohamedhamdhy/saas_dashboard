import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { User, Role, Organization, Session } from "../../../models";
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
      { model: Organization, as: "organization", attributes: ["name", "isActive"] }
    ]
  });

  if (!user) return next(new AppError("User not found", 404));

  sendResponse(res, 200, "Current user profile retrieved", { user });
});

export const updateMe = catchAsync(async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const user = await User.findByPk(req.user?.id);
  if (!user) return _next(new AppError("User not found", 404));

  const { password, roleId, organizationId, tokenVersion, ...updateData } = req.body;

  await user.update(updateData);
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

  user.tokenVersion = (user.tokenVersion || 0) + 1;

  await user.save();

  await Session.destroy({ where: { userId: user.id } });

  await logSecurityEvent(req, "PASSWORD_CHANGE_SUCCESS", user.id);

  sendResponse(res, 200, "Password updated successfully. All other devices logged out.");
});

export const getActiveSessions = catchAsync(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await Session.destroy({
    where: {
      userId,
      lastActive: { [Op.lt]: thirtyDaysAgo }
    }
  });

  const sessions = await Session.findAll({
    where: { userId },
    limit: 10,
    order: [["lastActive", "DESC"]]
  });

  sendResponse(res, 200, "Active sessions retrieved", sessions);
});

export const revokeAllSessions = catchAsync(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const user = await User.findByPk(userId);
  if (user) {
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.refreshToken = null;
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

export const revokeSession = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { sessionId } = req.params;
  const userId = req.user?.id;

  const session = await Session.findOne({
    where: { id: sessionId, userId }
  });

  if (!session) {
    return next(new AppError("Session not found or already expired.", 404));
  }

  await session.destroy();
  await logSecurityEvent(req, "SPECIFIC_SESSION_REVOKED", userId, { sessionId });

  sendResponse(res, 200, "Device has been successfully disconnected.");
});

export const updateUser = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const id = req.params.id as string;
  const user = await User.findByPk(id);

  if (!user) {
    return next(new AppError("User not found. Targeted update failed.", 404));
  }

  await user.update(req.body);

  await logSecurityEvent(req, "ADMIN_USER_UPDATED", req.user?.id, {
    targetUserId: id,
    updatedFields: Object.keys(req.body)
  });

  sendResponse(res, 200, "User updated successfully by administrator", { user });
});

export const deleteUser = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const id = req.params.id as string;
  const user = await User.findByPk(id);

  if (!user) {
    return next(new AppError("User not found. Deletion target does not exist.", 404));
  }

  await Session.destroy({ where: { userId: id } });

  await user.destroy({ force: true });

  await logSecurityEvent(req, "ADMIN_USER_DELETED", req.user?.id, { targetUserId: id });

  sendResponse(res, 200, "User has been deactivated and all sessions terminated.");
});
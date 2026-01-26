// MODULE: User & Session Management Controller
// Handles Administrative User CRUD, Personal Profile Updates, and Remote Session Revocation.

// HEADER: Imports & Setup
import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { User, Role, Organization, Session } from "../../../models";
import { AuthRequest } from "../../middleware/auth.middleware";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import { logSecurityEvent } from "../../utils/logger";
import { sendResponse } from "../../utils/sendResponse";
import { RoleName } from "../../../models/role";
/**
 * HEADER: Get All Users (Admin/SuperAdmin)
 * API: Fetches users based on organizational boundaries.
 * SECURITY: If not a SUPER_ADMIN, strictly limits the scope to the user's own organization.
 */
export const getAllUsers = catchAsync(async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const whereClause: any = {};

  // NOTE: Tenant Isolation Logic - Ensures data privacy between different SaaS customers.
  if (req.user?.roleName !== "SUPER_ADMIN") {
    whereClause.organizationId = req.user?.organizationId;
  }

  const users = await User.findAll({
    where: whereClause,
    include: [{ model: Role, as: "role", attributes: ["name"] }]
  });

  // AUDIT: Logging administrative views for compliance (e.g., SOC2/GDPR).
  await logSecurityEvent(req, "USER_LIST_VIEWED", req.user?.id, { count: users.length });

  sendResponse(res, 200, "Users retrieved successfully", users);
});

/**
 * HEADER: Get Personal Profile
 * API: Allows the logged-in user to fetch their own metadata.
 */
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

/**
 * HEADER: Update Personal Profile
 * SECURITY: Uses destructuring to strip sensitive fields (password, roleId) from req.body 
 * to prevent unauthorized privilege escalation (mass-assignment protection).
 */
export const updateMe = catchAsync(async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const user = await User.findByPk(req.user?.id);
  if (!user) return _next(new AppError("User not found", 404));

  // NOTE: Explicitly separating sensitive fields so they cannot be updated through this endpoint.
  const { password, roleId, organizationId, tokenVersion, ...updateData } = req.body;

  await user.update(updateData);
  await logSecurityEvent(req, "PROFILE_UPDATED", user.id);

  sendResponse(res, 200, "Profile updated successfully", { user });
});

/**
 * HEADER: Password Rotation & Global Logout
 * SECURITY: Updates 'tokenVersion' to immediately invalidate all existing JWTs.
 */
export const updateMyPassword = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findByPk(req.user?.id);

  // SECURITY: Standard verification before allowing credential changes.
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    await logSecurityEvent(req, "PASSWORD_CHANGE_FAILED", req.user?.id);
    return next(new AppError("Incorrect current password", 401));
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();

  // SECURITY: Incrementing tokenVersion creates a "Kill Switch" for all current sessions.
  user.tokenVersion = (user.tokenVersion || 0) + 1;

  await user.save();

  // DB: Forcefully destroying all physical session records for this user across all devices.
  await Session.destroy({ where: { userId: user.id } });

  await logSecurityEvent(req, "PASSWORD_CHANGE_SUCCESS", user.id);

  sendResponse(res, 200, "Password updated successfully. All other devices logged out.");
});

/**
 * HEADER: Active Session Monitoring
 * API: Allows users to see where they are logged in.
 * CLEANUP: Automatically purges sessions older than 30 days to keep the DB lean.
 */
export const getActiveSessions = catchAsync(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  // PERF: Maintenance logic within the request to remove stale sessions.
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

/**
 * HEADER: Global Session Revocation
 * SECURITY: Wipes refresh tokens and clears local cookies for a complete logout.
 */
export const revokeAllSessions = catchAsync(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const user = await User.findByPk(userId);
  if (user) {
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.refreshToken = null;
    await user.save();
  }

  await Session.destroy({ where: { userId } });

  // COOKIE: Clearing the browser-side persistence.
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });

  await logSecurityEvent(req, "ALL_SESSIONS_REVOKED", userId);

  sendResponse(res, 200, "All sessions have been terminated successfully.");
});

/**
 * HEADER: Targetted Device Revocation
 * API: Allows a user to log out of a specific device (e.g., "Log out of my office computer").
 */
export const revokeSession = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { sessionId } = req.params;
  const userId = req.user?.id;

  // SECURITY: Ensure the session actually belongs to the user requesting the deletion.
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

/**
 * HEADER: Administrative User Update
 * API: Allows Admins to modify specific user records.
 */
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

/**
 * HEADER: Hard User Deletion (Protected)
 * API: Removes a user permanently from the system with strict hierarchy checks.
 * SECURITY: 
 * 1. Only SuperAdmins can initiate deletions.
 * 2. Self-deletion is strictly prohibited to prevent system orphaning.
 * 3. SuperAdmin accounts are protected from all deletion attempts.
 */
export const deleteUser = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const targetId = req.params.id as string;
  const requesterId = req.user?.id;
  const requesterRole = req.user?.roleName;

  // SECTION: Authority Check
  // SECURITY: Only SuperAdmin is permitted to access the deletion logic.
  if (requesterRole !== RoleName.SuperAdmin) {
    return next(new AppError("Access Denied: Only SuperAdmins can delete accounts.", 403));
  }

  // SECTION: Self-Deletion Guard
  // SECURITY: Prevents a SuperAdmin from deleting their own account.
  if (targetId === requesterId) {
    return next(new AppError("Security Violation: You cannot delete your own account.", 400));
  }

  // SECTION: Target Verification
  // NOTE: We include the role to verify the target's status.
  const user = await User.findByPk(targetId, {
    include: [{ model: Role, as: "role", attributes: ["name"] }]
  });

  if (!user) {
    return next(new AppError("User not found. Deletion target does not exist.", 404));
  }

  // SECTION: Protected Account Guard
  // SECURITY: Prevents the deletion of ANY SuperAdmin, even by another SuperAdmin.
  if (user.role?.name === RoleName.SuperAdmin) {
    return next(new AppError("Action Prohibited: SuperAdmin accounts cannot be deleted.", 403));
  }

  // SECTION: Atomic Cleanup & Execution
  // DB: Clear active sessions first to ensure immediate access revocation.
  await Session.destroy({ where: { userId: targetId } });

  // NOTE: 'force: true' performs a hard delete, removing the record permanently from the disk.
  await user.destroy({ force: true });

  // AUDIT: Logging the administrative action for forensic trails.
  await logSecurityEvent(req, "ADMIN_USER_DELETED", requesterId, { 
    targetUserId: targetId,
    targetEmail: user.email 
  });

  sendResponse(res, 200, "User has been permanently deleted and all sessions terminated.");
});
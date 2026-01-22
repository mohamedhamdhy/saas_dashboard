// MODULE: User Profile & Account Controllers
// Handles self-service operations including profile retrieval, updates, and sensitive security changes.

// HEADER: Imports & Setup
import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { User, Role, Organization } from "../../../models/index";
import { AuthRequest } from "../../middleware/auth.middleware";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import { logSecurityEvent } from "../../utils/logger";
import { generateTokens } from "../../utils/token";
import { sendResponse } from "../../utils/sendResponse";

/**
 * HEADER: Get Current User Profile
 * API: Fetches the logged-in user's details including their permissions and tenant info.
 * NOTE: Eager loading (include) is used to minimize database round-trips.
 */
export const getMe = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  // DB: Fetching user with joined Role and Organization data for frontend context.
  const user = await User.findByPk(req.user?.id, {
    include: [
      { model: Role, as: "role", attributes: ["name"] },
      { model: Organization, as: "organization", attributes: ["name", "isActive"] }
    ]
  });

  if (!user) return next(new AppError("User not found", 404));

  sendResponse(res, 200, "User profile retrieved successfully", { user });
});

/**
 * HEADER: Update Profile Information
 * API: Allows users to change non-sensitive identity fields.
 * SECURITY: Implements "Field Filtering" to prevent mass-assignment vulnerabilities.
 */
export const updateMe = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  // SECURITY: Strictly define which fields a user is allowed to touch.
  const allowedFields = ["name", "email", "phoneNumber"];
  const filteredBody: any = {};

  // NOTE: This loop ensures users cannot change their own 'role' or 'organizationId'.
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

/**
 * HEADER: Secure Password Update
 * API: Validates current password before applying a new one.
 * SECURITY: Triggers token rotation and security logging upon success/failure.
 */
export const updateMyPassword = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findByPk(req.user?.id);
  if (!user) return next(new AppError("User not found", 404));

  // SECURITY: Verify the existing password before allowing a change.
  const isCorrect = await bcrypt.compare(currentPassword, user.password);
  if (!isCorrect) {
    // AUDIT: Logging failed attempts helps detect account takeover attempts.
    await logSecurityEvent(req, "PASSWORD_CHANGE_FAILED", user.id);
    return next(new AppError("Current password is incorrect", 401));
  }

  // CRYPTO: Using a Salt Round of 12 for high security.
  user.password = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();

  // SECURITY: Rotating tokens forces a "Logout Everywhere" effect if required.
  const { accessToken, refreshToken } = generateTokens(user);
  user.refreshToken = refreshToken;
  await user.save();

  // NOTE: Setting the new Refresh Token in an HttpOnly cookie for web security.
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  // AUDIT: Permanent record of successful security credential change.
  await logSecurityEvent(req, "PASSWORD_CHANGE_SUCCESS", user.id);

  sendResponse(res, 200, "Password updated successfully. Other sessions have been invalidated.", {
    accessToken
  });
});
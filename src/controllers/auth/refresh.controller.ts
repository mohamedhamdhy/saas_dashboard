// MODULE: Token Refresh Orchestrator
// Manages the issuance of new Access Tokens using long-lived Refresh Tokens.
// Implements "Rotation" strategy to detect and prevent session hijacking.

// HEADER: Imports & Setup
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, Role } from "../../../models/index";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { generateTokens } from "../../utils/token";
import { sendResponse } from "../../utils/sendResponse";

const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret";

/**
 * HEADER: Refresh Token Handler
 * API: Validates a Refresh Token and issues a new pair (Access + Refresh).
 * SECURITY: Implements three layers of verification: Signature, Versioning, and DB Matching.
 */
export const refreshToken = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // SECTION: Extraction
  // NOTE: Pulling from HttpOnly cookies prevents JavaScript-based theft (XSS).
  const incomingRefreshToken = req.cookies.refreshToken;

  if (!incomingRefreshToken) {
    return next(new AppError("No refresh token provided. Please log in.", 401));
  }

  // SECTION: Cryptographic Verification
  let decoded: any;
  try {
    decoded = jwt.verify(incomingRefreshToken, REFRESH_SECRET);
  } catch (err) {
    return next(new AppError("Invalid or expired refresh token.", 401));
  }

  // SECTION: User Context Retrieval
  const user = await User.findByPk(decoded.id, {
    include: [{ model: Role, as: "role", attributes: ["name"] }]
  });

  if (!user) {
    return next(new AppError("User no longer exists.", 401));
  }

  // SECTION: Security Logic - Token Versioning
  // SECURITY: If user changed password or clicked 'Logout All Devices', tokenVersion increments.
  // This renders all old tokens instantly invalid.
  if (user.tokenVersion !== decoded.tokenVersion) {
    res.clearCookie("refreshToken");
    return next(new AppError("Security Alert: This session has been revoked. Please log in again.", 401));
  }

  // SECTION: Security Logic - Rotation Check
  // NOTE: We only allow the MOST RECENTLY issued refresh token to be used.
  // If a leaked token is used twice, this check detects the reuse and fails.
  if (user.refreshToken !== incomingRefreshToken) {
    return next(new AppError("Session expired or hijacked. Please log in again.", 401));
  }

  // SECTION: Token Rotation & Re-issuance
  // API: Generating a FRESH pair. The old refresh token is now "burned."
  const tokens = generateTokens(user);

  // DB: Persisting the NEW refresh token for the next cycle.
  user.refreshToken = tokens.refreshToken;
  await user.save();

  // COOKIE: Updating the client browser with the new Refresh Token.
  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days
  });

  // API: Sending the new Access Token back for API calls.
  sendResponse(res, 200, "Token refreshed successfully", {
    accessToken: tokens.accessToken
  });
});
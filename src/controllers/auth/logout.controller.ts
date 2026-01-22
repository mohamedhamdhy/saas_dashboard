// MODULE: Authentication Termination Logic
// Handles the multi-layered invalidation of user credentials and active sessions.

// HEADER: Imports & Setup
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, Blacklist, Session } from "../../../models/index";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import { logSecurityEvent } from "../../utils/logger";
import { sendResponse } from "../../utils/sendResponse";

/**
 * HEADER: Secure Logout Controller
 * API: Invalidate Access Tokens, Refresh Tokens, and Session records.
 * SECURITY: Implements token blacklisting to prevent "Zombies" (tokens that stay valid until expiry).
 */
export const logout = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // SECTION: Token Extraction
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return next(new AppError("No active session found.", 400));
  }

  // SECTION: Access Token Blacklisting
  // NOTE: Since JWTs are stateless, we must store the logged-out token in a Blacklist until it expires.
  const decoded: any = jwt.decode(token);

  if (decoded?.exp) {
    await Blacklist.create({
      token: token,
      // SECURITY: Set blacklist expiry to match the JWT expiry to save DB space later via Cron.
      expiresAt: new Date(decoded.exp * 1000) 
    });
  }

  // SECTION: Identity Context
  const userId = decoded?.id || (req as any).user?.id;

  if (userId) {
    // SECTION: Session Forensics Removal
    // DB: Soft-deletes the session record matching this specific device/IP.
    await Session.destroy({
      where: {
        userId: userId,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
        userAgent: req.headers["user-agent"] || "Unknown Device"
      }
    });

    // SECTION: Refresh Token Invalidation
    // SECURITY: Wiping the Refresh Token from the DB ensures the 'Refresh' flow will fail for this user.
    await User.update(
      { refreshToken: null },
      { where: { id: userId } }
    );
  }

  // SECTION: Browser Cleanup
  // COOKIE: Removes the HttpOnly cookie from the client's browser.
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  // AUDIT: Logging the logout event for security monitoring and compliance.
  await logSecurityEvent(req, "USER_LOGOUT", userId || null);

  sendResponse(res, 200, "Logged out from this device successfully.");
});
// MODULE: Identity & Access Management (IAM) Middleware
// HEADER: Imports & Setup
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, Blacklist, Role, Organization, Session } from "../../models/index";
import { AppError } from "../utils/appError";
import { catchAsync } from "../utils/catchAsync";

// SECURITY: Fallback secret for development; must be managed via ENV in production.
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key";

// PROPS: Extending Express Request to include authenticated user context.
export interface AuthRequest extends Request {
  user?: {
    id: string;
    roleName: string;
    organizationId?: string | null;
  };
}

// HEADER: Primary Authentication Logic
// API: Validates JWT, session status, and account integrity.
export const authMiddleware = catchAsync(async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  let token: string;

  // SECURITY: Extracting the Bearer token from the Authorization header.
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else {
    return next(new AppError("No token provided. Please log in.", 401));
  }

  // SECURITY: Check against Blacklist table for manually revoked tokens (Logout).
  const isBlacklisted = await Blacklist.findOne({ where: { token } });
  if (isBlacklisted) {
    return next(new AppError("This session has been revoked. Please log in again.", 401));
  }

  let decoded: any;
  try {
    // SECURITY: Verifying the cryptographic signature of the JWT.
    decoded = jwt.verify(token, JWT_SECRET);

    // SECURITY: Blocking access if MFA is enabled but not yet completed.
    if (decoded.mfaStep) {
      return next(new AppError("MFA verification incomplete. Please verify your OTP code.", 401));
    }

  } catch (err: any) {
    // FIX: Handling specific JWT errors to provide clear feedback (Expired vs Malformed).
    const message = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return next(new AppError(message, 401));
  }

  // DB: Hydrating user data with associated Role and Organization status.
  const user = await User.findByPk(decoded.id, {
    include: [
      { model: Role, as: "role", attributes: ["name"] },
      { model: Organization, as: "organization", attributes: ["isActive"] }
    ]
  });

  // SECURITY: Verifying the subject of the token still exists in the DB.
  if (!user) {
    return next(new AppError("The user belonging to this token no longer exists.", 401));
  }

  // SECURITY: Token Versioning check (prevents use of old tokens after a global 'Logout All Devices').
  if (user.tokenVersion !== decoded.tokenVersion) {
    return next(new AppError("Security Alert: This session has been remotely revoked. Please log in again.", 401));
  }

  // SECURITY: Immediate lockout if account status is set to inactive.
  if (!user.isActive) {
    return next(new AppError("Your account has been deactivated.", 403));
  }

  // SECURITY: Multi-tenancy isolation; block users if their parent organization is suspended.
  if (user.organizationId && !user.organization?.isActive) {
    return next(new AppError("Access denied. Your organization's account is inactive.", 403));
  }

  // SECURITY: Password Freshness Check.
  // NOTE: Invalidates tokens issued BEFORE a password change event.
  if (user.passwordChangedAt) {
    const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
    if (changedTimestamp > decoded.iat) {
      return next(new AppError("Security alert: Password recently changed. Please log in again.", 401));
    }
  }

  // STATE: Updating the session 'Heartbeat' asynchronously to track user activity.
  // PERF: We do not 'await' this update to prevent blocking the main request cycle.
  Session.update(
    { lastActive: new Date() },
    {
      where: {
        userId: user.id,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
        userAgent: req.headers["user-agent"] || "Unknown Device"
      }
    }
  ).catch(err => console.error("Session update failed:", err));

  // STATE: Injecting sanitized user metadata into the request object for downstream controllers.
  req.user = {
    id: user.id,
    roleName: user.role?.name || "GUEST",
    organizationId: user.organizationId
  };

  next();
});

// HEADER: Role-Based Access Control (RBAC) Guard
// NOTE: Factory function that returns a middleware for specific route authorization.
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    // SECURITY: Ensure authMiddleware was executed prior to this guard.
    if (!req.user) {
      return next(new AppError("Authentication required.", 401));
    }

    // SECURITY: Final check to see if the user's role matches the route requirements.
    if (!allowedRoles.includes(req.user.roleName)) {
      return next(new AppError(
        `Access denied. Requires one of the following roles: ${allowedRoles.join(", ")}`,
        403
      ));
    }

    next();
  };
};
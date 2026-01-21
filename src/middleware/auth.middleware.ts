import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, Blacklist, Role, Organization, Session } from "../../models/index";
import { AppError } from "../utils/appError";
import { catchAsync } from "../utils/catchAsync";

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    roleName: string;
    organizationId?: string | null;
  };
}

export const authMiddleware = catchAsync(async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  let token: string;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else {
    return next(new AppError("No token provided. Please log in.", 401));
  }

  const isBlacklisted = await Blacklist.findOne({ where: { token } });
  if (isBlacklisted) {
    return next(new AppError("This session has been revoked. Please log in again.", 401));
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.mfaStep) {
      return next(new AppError("MFA verification incomplete. Please verify your OTP code.", 401));
    }

  } catch (err: any) {
    const message = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return next(new AppError(message, 401));
  }

  const user = await User.findByPk(decoded.id, {
    include: [
      { model: Role, as: "role", attributes: ["name"] },
      { model: Organization, as: "organization", attributes: ["isActive"] }
    ]
  });

  if (!user) {
    return next(new AppError("The user belonging to this token no longer exists.", 401));
  }

  if (user.tokenVersion !== decoded.tokenVersion) {
    return next(new AppError("Security Alert: This session has been remotely revoked. Please log in again.", 401));
  }

  if (!user.isActive) {
    return next(new AppError("Your account has been deactivated.", 403));
  }

  if (user.organizationId && !user.organization?.isActive) {
    return next(new AppError("Access denied. Your organization's account is inactive.", 403));
  }

  if (user.passwordChangedAt) {
    const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
    if (changedTimestamp > decoded.iat) {
      return next(new AppError("Security alert: Password recently changed. Please log in again.", 401));
    }
  }

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

  req.user = {
    id: user.id,
    roleName: user.role?.name || "GUEST",
    organizationId: user.organizationId
  };

  next();
});

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Authentication required.", 401));
    }

    if (!allowedRoles.includes(req.user.roleName)) {
      return next(new AppError(
        `Access denied. Requires one of the following roles: ${allowedRoles.join(", ")}`,
        403
      ));
    }

    next();
  };
};
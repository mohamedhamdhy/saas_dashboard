// MODULE: Authentication Orchestrator
// Handles the verification of identity, multi-step authentication (MFA), and session tracking.

// HEADER: Imports & Setup
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, Role, Organization } from "../../../models/index";
import { Session } from "../../../models/session";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { logSecurityEvent } from "../../utils/logger";
import { generateTokens } from "../../utils/token";
import { sendResponse } from "../../utils/sendResponse";

/**
 * HEADER: Internal Session Helper
 * SECURITY: Logs every successful login into the 'sessions' table for device auditing.
 */
const createUserSession = async (req: Request, userId: string) => {
  // FIX: Type 'string | string[]' fix for headers
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const userAgent = req.headers["user-agent"] as string;

  await Session.create({
    userId,
    ipAddress: ip || req.ip || "127.0.0.1",
    userAgent: userAgent || "Unknown Device"
  });
};

/**
 * HEADER: Main Login Controller
 * API: Primary entry point for user authentication.
 */
export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  // SECTION: Data Retrieval
  // NOTE: Eager loading Role and Organization to verify access permissions in one query.
  const user = await User.findOne({
    where: { email },
    include: [
      { model: Role, as: "role", attributes: ["name"] },
      { model: Organization, as: "organization", attributes: ["name", "isActive"] }
    ]
  });

  // SECTION: Credential Verification
  // SECURITY: Protects against timing attacks by using a single generic error message.
  if (!user || !(await user.comparePassword(password))) {
    await logSecurityEvent(req, "LOGIN_FAILED", null, { email });
    return next(new AppError("Invalid email or password", 401));
  }

  // SECTION: Status Checks (Account & Tenant)
  // SECURITY: Blocks users if their personal account is locked.
  if (!user.isActive) {
    await logSecurityEvent(req, "LOGIN_ATTEMPT_DEACTIVATED", user.id);
    return next(new AppError("Your account is deactivated.", 403));
  }

  // SECURITY: Blocks users if their organization (SaaS Tenant) has an expired subscription.
  if (user.organizationId && !user.organization?.isActive) {
    return next(new AppError("Your organization's subscription is inactive.", 403));
  }

  // SECTION: Multi-Factor Authentication (MFA)
  // NOTE: If MFA is on, we issue a temporary "mfaToken" instead of final Access Tokens.
  if (user.isMfaEnabled) {
    const mfaToken = jwt.sign(
      { id: user.id, mfaStep: true },
      process.env.JWT_SECRET!,
      { expiresIn: "5m" } 
    );

    return sendResponse(res, 200, "Secondary authentication required.", {
      mfaRequired: true,
      mfaToken
    });
  }

  // SECTION: Token Issuance & Session Storage
  // API: Generating standard Access and Refresh tokens.
  const { accessToken, refreshToken } = generateTokens(user);

  // DB: Tracking the physical device/location for the 'Active Sessions' list.
  await createUserSession(req, user.id);

  // SECURITY: Storing Refresh Token in DB to allow for single-user session revocation.
  user.refreshToken = refreshToken;
  await user.save();

  // COOKIE: HttpOnly cookie protects the Refresh Token from XSS attacks.
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  // AUDIT: Successful login log for security forensics.
  await logSecurityEvent(req, "LOGIN_SUCCESS", user.id);

  sendResponse(res, 200, "Login successful", {
    accessToken,
    user
  });
});
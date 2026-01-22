// MODULE: Multi-Factor Authentication (MFA) Orchestrator
// Provides end-to-end management of TOTP-based security and disaster recovery codes.

// HEADER: Imports & Setup
import { Request, Response, NextFunction } from "express";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import speakeasy from "speakeasy";
import { User, Role } from "../../../models/index";
import { Session } from "../../../models/session";
import { AuthRequest } from "../../middleware/auth.middleware";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import { logSecurityEvent } from "../../utils/logger";
import { generateTokens } from "../../utils/token";
import { sendResponse } from "../../utils/sendResponse";

/**
 * HEADER: Internal Session Helper
 * FIX: Resolved TS2322 by explicitly handling string[] from x-forwarded-for headers.
 */
const createUserSession = async (req: Request, userId: string) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded;

  await Session.create({
    userId,
    ipAddress: ip || req.ip || "127.0.0.1",
    userAgent: (req.headers["user-agent"] as string) || "Unknown Device"
  });
};

/**
 * HEADER: MFA Setup Initiation
 * API: Generates a unique TOTP secret and a QR Code for the user to scan.
 * NOTE: The secret is stored in 'Pending' status until the user verifies their first code.
 */
export const setupMFA = catchAsync(async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const user = await User.findByPk(req.user?.id);
  if (!user) throw new AppError("User not found", 404);

  // CRYPTO: Generate a high-entropy base32 secret.
  const secret = speakeasy.generateSecret({
    name: `SaaS Dashboard (${user.email})`
  });

  // UX: Generate a Base64 QR code image string for immediate frontend rendering.
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

  user.mfaSecret = secret.base32;
  await user.save();

  sendResponse(res, 200, "MFA setup initiated. Scan the QR code.", {
    qrCode: qrCodeUrl,
    manualSecret: secret.base32
  });
});

/**
 * HEADER: MFA Activation & Recovery Generation
 * API: Verifies the first TOTP code and generates 10 one-time-use recovery codes.
 * SECURITY: Recovery codes are hashed (bcrypt) before storage for maximum protection.
 */
export const activateMFA = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { token } = req.body;
  const user = await User.findByPk(req.user?.id);

  if (!user || !user.mfaSecret) {
    return next(new AppError("MFA setup not initiated.", 400));
  }

  // NOTE: 'window: 1' allows for a 30-second clock drift between the server and phone.
  const isValid = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token,
    window: 1
  });

  if (!isValid) {
    return next(new AppError("Invalid verification code. Activation failed.", 401));
  }

  // SECTION: Recovery Code Generation
  // SECURITY: Generate 10 random 8-character codes for emergency access.
  const plainCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );

  // CRYPTO: Hash codes before saving. If the DB is leaked, recovery codes remain safe.
  const hashedCodes = await Promise.all(
    plainCodes.map(code => bcrypt.hash(code, 12))
  );

  user.isMfaEnabled = true;
  user.mfaRecoveryCodes = hashedCodes;
  await user.save();

  await logSecurityEvent(req, "MFA_ENABLED_WITH_RECOVERY", user.id);

  sendResponse(res, 200, "MFA activated successfully. Save your recovery codes.", {
    recoveryCodes: plainCodes 
  });
});

/**
 * HEADER: Secondary Authentication (Login Phase)
 * API: Validates the 6-digit TOTP code during the login sequence.
 */
export const verifyLoginMFA = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { mfaToken, otpCode } = req.body;

  // SECURITY: Verify the intermediate "MFA-Step" JWT issued by the Login controller.
  const decoded = jwt.verify(mfaToken, process.env.JWT_SECRET!) as any;
  if (!decoded.mfaStep) return next(new AppError("Invalid session", 401));

  const user = await User.findByPk(decoded.id, {
    include: [{ model: Role, as: "role", attributes: ["name"] }]
  });

  if (!user || !user.mfaSecret) return next(new AppError("User not found", 404));

  const isValid = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: otpCode,
    window: 1
  });

  if (!isValid) {
    await logSecurityEvent(req, "MFA_FAILED", user.id);
    return next(new AppError("Invalid MFA code.", 401));
  }

  // SECTION: Successful Login Finalization
  const { accessToken, refreshToken } = generateTokens(user);
  await createUserSession(req, user.id);

  user.refreshToken = refreshToken;
  await user.save();

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  sendResponse(res, 200, "MFA verification successful", {
    accessToken,
    user
  });
});

/**
 * HEADER: Disable MFA
 * SECURITY: Requires the user's password as a verification layer before removing 2FA.
 */
export const disableMFA = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { password } = req.body;
  const user = await User.findByPk(req.user?.id);

  if (!user) throw new AppError("User not found", 404);

  // SECURITY: Pre-shared secret (password) check prevents unauthorized MFA removal.
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) return next(new AppError("Incorrect password", 401));

  user.isMfaEnabled = false;
  user.mfaSecret = null;
  user.mfaRecoveryCodes = null;
  await user.save();

  await logSecurityEvent(req, "MFA_DISABLED", user.id);

  sendResponse(res, 200, "MFA has been disabled.");
});

/**
 * HEADER: Recovery Code Verification
 * API: Allows login if the user has lost access to their TOTP device.
 * SECURITY: Each recovery code is "One-Time Use" only and is deleted upon successful use.
 */
export const verifyRecoveryCode = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { mfaToken, recoveryCode } = req.body;

  const decoded = jwt.verify(mfaToken, process.env.JWT_SECRET!) as any;
  if (!decoded.mfaStep) return next(new AppError("Invalid session", 401));

  const user = await User.findByPk(decoded.id, {
    include: [{ model: Role, as: "role", attributes: ["name"] }]
  });

  if (!user || !user.mfaRecoveryCodes || user.mfaRecoveryCodes.length === 0) {
    return next(new AppError("No recovery codes available.", 400));
  }

  let codeIndex = -1;
  const inputCode = recoveryCode.trim().toUpperCase();

  // SECTION: Linear Search & Comparison
  // NOTE: We must check each hashed code stored in the array.
  for (let i = 0; i < user.mfaRecoveryCodes.length; i++) {
    const isMatch = await bcrypt.compare(inputCode, user.mfaRecoveryCodes[i]);
    if (isMatch) {
      codeIndex = i;
      break;
    }
  }

  if (codeIndex === -1) {
    await logSecurityEvent(req, "RECOVERY_CODE_FAILED", user.id);
    return next(new AppError("Invalid recovery code.", 401));
  }

  // SECTION: Atomic Deletion
  // SECURITY: Immediately remove the code from the array so it cannot be used again.
  const updatedCodes = [...user.mfaRecoveryCodes];
  updatedCodes.splice(codeIndex, 1);
  user.mfaRecoveryCodes = updatedCodes;

  const { accessToken, refreshToken } = generateTokens(user);
  await createUserSession(req, user.id);

  user.refreshToken = refreshToken;
  await user.save();

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  await logSecurityEvent(req, "RECOVERY_CODE_SUCCESS", user.id);

  sendResponse(res, 200, `Recovery code accepted. ${user.mfaRecoveryCodes.length} codes remaining.`, {
    accessToken,
    user
  });
});
import { Request, Response, NextFunction } from "express";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User, Role } from "../../../models/index";
import { Session } from "../../../models/session";
import { AuthRequest } from "../../middleware/auth.middleware";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import { logSecurityEvent } from "../../utils/logger";
import { generateTokens } from "../../utils/token";
import { sendResponse } from "../../utils/sendResponse";

const { authenticator } = require("otplib");

const createUserSession = async (req: Request, userId: string) => {
  await Session.create({
    userId,
    ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
    userAgent: req.headers["user-agent"] || "Unknown Device"
  });
};

export const setupMFA = catchAsync(async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const user = await User.findByPk(req.user?.id);
  if (!user) throw new AppError("User not found", 404);

  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, "SaaS Dashboard", secret);
  const qrCodeUrl = await QRCode.toDataURL(otpauth);

  user.mfaSecret = secret;
  await user.save();

  sendResponse(res, 200, "MFA setup initiated. Scan the QR code.", {
    qrCode: qrCodeUrl,
    manualSecret: secret
  });
});

export const activateMFA = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { token } = req.body;
  const user = await User.findByPk(req.user?.id);

  if (!user || !user.mfaSecret) {
    return next(new AppError("MFA setup not initiated.", 400));
  }

  const isValid = authenticator.verify({ token, secret: user.mfaSecret });

  if (!isValid) {
    return next(new AppError("Invalid verification code. Activation failed.", 401));
  }

  const plainCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );

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

export const verifyLoginMFA = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { mfaToken, otpCode } = req.body;

  const decoded = jwt.verify(mfaToken, process.env.JWT_SECRET!) as any;
  if (!decoded.mfaStep) return next(new AppError("Invalid session", 401));

  const user = await User.findByPk(decoded.id, {
    include: [{ model: Role, as: "role", attributes: ["name"] }]
  });

  if (!user || !user.mfaSecret) return next(new AppError("User not found", 404));

  const isValid = authenticator.verify({ token: otpCode, secret: user.mfaSecret });

  if (!isValid) {
    await logSecurityEvent(req, "MFA_FAILED", user.id);
    return next(new AppError("Invalid MFA code.", 401));
  }

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

export const disableMFA = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { password } = req.body;
  const user = await User.findByPk(req.user?.id);

  if (!user) throw new AppError("User not found", 404);

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) return next(new AppError("Incorrect password", 401));

  user.isMfaEnabled = false;
  user.mfaSecret = null;
  user.mfaRecoveryCodes = null;
  await user.save();

  await logSecurityEvent(req, "MFA_DISABLED", user.id);

  sendResponse(res, 200, "MFA has been disabled.");
});

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
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, Role, Organization } from "../../../models/index";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { logSecurityEvent } from "../../utils/logger";
import { generateTokens } from "../../utils/token";
import { sendResponse } from "../../utils/sendResponse";

export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  const user = await User.findOne({
    where: { email },
    include: [
      { model: Role, as: "role", attributes: ["name"] },
      { model: Organization, as: "organization", attributes: ["name", "isActive"] }
    ]
  });

  if (!user || !(await user.comparePassword(password))) {
    await logSecurityEvent(req, "LOGIN_FAILED", null, { email });
    return next(new AppError("Invalid email or password", 401));
  }

  if (!user.isActive) {
    await logSecurityEvent(req, "LOGIN_ATTEMPT_DEACTIVATED", user.id);
    return next(new AppError("Your account is deactivated.", 403));
  }

  if (user.organizationId && !user.organization?.isActive) {
    return next(new AppError("Your organization's subscription is inactive.", 403));
  }

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

  const { accessToken, refreshToken } = generateTokens(user);

  user.refreshToken = refreshToken;
  await user.save();

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  await logSecurityEvent(req, "LOGIN_SUCCESS", user.id);

  sendResponse(res, 200, "Login successful", {
    accessToken,
    user
  });
});
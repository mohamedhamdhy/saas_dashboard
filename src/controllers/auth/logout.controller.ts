import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../../../models/user";
import { Blacklist } from "../../../models/blacklist";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import { logSecurityEvent } from "../../utils/logger";
import { sendResponse } from "../../utils/sendResponse";

export const logout = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return next(new AppError("No active session found.", 400));
  }

  const decoded: any = jwt.decode(token);
  if (decoded?.exp) {
    await Blacklist.create({
      token: token,
      expiresAt: new Date(decoded.exp * 1000)
    });
  }

  const userId = decoded?.id || (req as any).user?.id;
  if (userId) {
    await User.update(
      { refreshToken: null },
      { where: { id: userId } }
    );
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  await logSecurityEvent(req, "USER_LOGOUT", userId || null);

  sendResponse(res, 200, "Session terminated successfully.");
});
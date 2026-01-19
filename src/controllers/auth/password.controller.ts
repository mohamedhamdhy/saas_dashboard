import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { User } from "../../../models/index";
import { Op } from "sequelize";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { logSecurityEvent } from "../../utils/logger";
import { sendEmail } from "../../utils/email";
import { sendResponse } from "../../utils/sendResponse";

export const forgotPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
        await logSecurityEvent(req, "PASSWORD_RESET_REQUEST_NONEXISTENT", null, { email });
        return sendResponse(res, 200, "If an account exists, a reset email was sent.");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    const resetURL = `${req.protocol}://${req.get("host")}/api/auth/reset-password/${resetToken}`;
    const message = `Forgot your password? Reset it here: ${resetURL}\nIf you didn't forget your password, please ignore this email!`;

    try {
        await sendEmail({
            email: user.email,
            subject: "Your password reset token (valid for 10 min)",
            message,
        });

        await logSecurityEvent(req, "PASSWORD_RESET_REQUESTED", user.id, { email });

        sendResponse(res, 200, "Token sent to email!");
    } catch (err: any) {
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();

        return next(new AppError("There was an error sending the email. Try again later.", 500));
    }
});

export const resetPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token as string).digest("hex");

    const user = await User.findOne({
        where: {
            passwordResetToken: hashedToken,
            passwordResetExpires: { [Op.gt]: new Date() }
        }
    });

    if (!user) {
        await logSecurityEvent(req, "PASSWORD_RESET_FAILED_BAD_TOKEN", null, { tokenProvided: hashedToken });
        return next(new AppError("Token is invalid or has expired", 400));
    }

    user.password = await bcrypt.hash(password, 12);
    user.passwordChangedAt = new Date();
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    await user.save();

    await logSecurityEvent(req, "PASSWORD_RESET_SUCCESS", user.id);

    sendResponse(res, 200, "Password reset successful. Please login again.");
});
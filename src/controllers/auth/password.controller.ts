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

    const htmlTemplate = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #f0f0f0; border-radius: 8px;">
        <div style="text-align: center; padding-bottom: 20px;">
            <h1 style="color: #0052cc; margin: 0; font-size: 28px;">High Minds Digital</h1>
        </div>

        <h2 style="font-size: 20px; font-weight: 600;">Welcome back! 👋</h2>
        
        <p>We received a request to reset the password for your account. We’re sorry to hear you’re having trouble logging in—it happens to the best of us! 😅</p>
        
        <p>To get you back into your workspace safely, please click the button below to set a new password:</p>

        <div style="text-align: center; margin: 35px 0;">
            <a href="${resetURL}" style="background-color: #0052cc; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                Reset My Password 🔑
            </a>
        </div>

        <p style="font-size: 14px; line-height: 1.6;">
            <strong>Security Note:</strong> This link is valid for only <span style="color: #d32f2f;">10 minutes</span> for your protection. After that, you'll need to request a new one.
        </p>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin-top: 25px;">
            <p style="margin: 0; font-size: 13px; color: #666;">
                <strong>Didn't request this?</strong> If you didn't initiate this change, please ignore this email or contact our security team if you have concerns. Your account remains secure.
            </p>
        </div>

        <p style="margin-top: 30px; font-size: 14px;">
            Best regards,<br>
            <strong>The HMD Engineering Team</strong> 🚀
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 11px; color: #aaa; text-align: center;">
            © 2026 HMD Pvt. Ltd. All rights reserved.<br>
            This is an automated security notification.
        </p>
    </div>`;

    const textFallback = `Welcome to High Minds Digital!\n\nWe're sorry you're having trouble logging in. Reset your password by visiting this link: ${resetURL}\n\nNote: This link expires in 10 minutes.`;

    try {
        await sendEmail({
            email: user.email,
            subject: "🔐 Secure Password Reset - High Minds Digital",
            message: textFallback,
            html: htmlTemplate,
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
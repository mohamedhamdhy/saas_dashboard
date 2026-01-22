// MODULE: Password Recovery Orchestrator
// Handles secure identity verification via email and cryptographic token validation.

// HEADER: Imports & Setup
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

/**
 * HEADER: Forgot Password Initiation
 * API: Generates a temporary reset token and dispatches a secure email.
 * SECURITY: Implements "Silent Failure" for non-existent emails to prevent Account Enumeration attacks.
 */
export const forgotPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    // SECURITY: If the user doesn't exist, we do NOT tell the requester. 
    // This prevents hackers from figuring out which emails are registered in your system.
    if (!user) {
        await logSecurityEvent(req, "PASSWORD_RESET_REQUEST_NONEXISTENT", null, { email });
        return sendResponse(res, 200, "If an account exists, a reset email was sent.");
    }

    // SECTION: Secure Token Generation
    // CRYPTO: Generate a high-entropy random string (32 bytes).
    const resetToken = crypto.randomBytes(32).toString("hex");

    // SECURITY: We only store the HASHED version in the database (SHA-256).
    // NOTE: This protects the user even if the DB is leaked; the leaked hash is useless without the original token.
    user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // PERF: Token is set to expire in exactly 10 minutes to minimize the attack window.
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    // SECTION: Email Dispatch
    // API: Construct the URL pointing to your frontend or API reset endpoint.
    const resetURL = `${req.protocol}://${req.get("host")}/api/auth/reset-password/${resetToken}`;

    const htmlTemplate = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #f0f0f0; border-radius: 8px;">
        <div style="text-align: center; padding-bottom: 20px;">
            <h1 style="color: #0052cc; margin: 0; font-size: 28px;">High Minds Digital</h1>
        </div>
        <h2 style="font-size: 20px; font-weight: 600;">Welcome back! 👋</h2>
        <p>We received a request to reset the password for your account.</p>
        <div style="text-align: center; margin: 35px 0;">
            <a href="${resetURL}" style="background-color: #0052cc; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                Reset My Password 🔑
            </a>
        </div>
        <p style="font-size: 14px; line-height: 1.6;">
            <strong>Security Note:</strong> This link is valid for only <span style="color: #d32f2f;">10 minutes</span>.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 11px; color: #aaa; text-align: center;">© 2026 HMD Pvt. Ltd.</p>
    </div>`;

    const textFallback = `Reset your password by visiting this link: ${resetURL}\n\nNote: Link expires in 10 minutes.`;

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
        // CLEANUP: If the email service fails, we must reset the token fields so the user can try again.
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();

        return next(new AppError("There was an error sending the email. Try again later.", 500));
    }
});

/**
 * HEADER: Password Reset Execution
 * API: Validates the token and updates the user's password.
 * SECURITY: Immediately invalidates the reset token upon successful use.
 */
export const resetPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;
    const { password } = req.body;

    // SECURITY: Hash the token received via URL to compare it with the one in the DB.
    const hashedToken = crypto.createHash("sha256").update(token as string).digest("hex");

    // SECTION: Database Validation
    // NOTE: Checking both the token and the 'passwordResetExpires' timestamp.
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

    // SECTION: Password Transformation
    // CRYPTO: Re-hashing the new password with bcrypt salt-round 12.
    user.password = await bcrypt.hash(password, 12);

    // SECURITY: Tracking 'passwordChangedAt' is vital for checking JWT issuance dates.
    user.passwordChangedAt = new Date();

    // CLEANUP: Unset recovery fields to ensure the same token cannot be used twice (Single Use Only).
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    await user.save();

    await logSecurityEvent(req, "PASSWORD_RESET_SUCCESS", user.id);

    sendResponse(res, 200, "Password reset successful. Please login again.");
});
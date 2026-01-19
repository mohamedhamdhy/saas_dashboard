import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { User, Role, Organization } from "../../../models/index";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { logSecurityEvent } from "../../utils/logger";
import { sendEmail } from "../../utils/email";
import { sendResponse } from "../../utils/sendResponse";

export const register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, roleName, organizationName, phoneNumber } = req.body;

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return next(new AppError("User with this email already exists", 400));
  }

  const role = await Role.findOne({ where: { name: roleName } });
  if (!role) {
    return next(new AppError(`Role '${roleName}' not found.`, 404));
  }

  let organizationId: string | null = null;
  if (roleName !== "SUPER_ADMIN") {
    if (!organizationName) {
      return next(new AppError("organizationName is required for this role.", 400));
    }

    const org = await Organization.findOne({ where: { name: organizationName } });
    if (!org) {
      return next(new AppError(`Organization '${organizationName}' not found.`, 404));
    }
    organizationId = org.id;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
    roleId: role.id,
    organizationId,
    phoneNumber,
    isActive: true,
    isMfaEnabled: false,
  });

  const userWithData = await User.findByPk(newUser.id, {
    include: [
      { model: Role, as: "role", attributes: ["name"] },
      { model: Organization, as: "organization", attributes: ["name", "email"] }
    ]
  });

  const loginURL = `${req.protocol}://${req.get("host")}/login`;
  const welcomeMessage = `
    Hi ${name},

    Welcome to the Dashboard! Your account has been created successfully.
    
    IMPORTANT: For your security, you will be required to set up 
    Multi-Factor Authentication (MFA) upon your first login.

    Login here: ${loginURL}
    Registered email: ${email}
  `;

  try {
    await sendEmail({
      email: newUser.email,
      subject: "Welcome & Security Setup Required",
      message: welcomeMessage,
    });

    await logSecurityEvent(req, "USER_REGISTERED_AND_NOTIFIED", newUser.id, { role: roleName });
  } catch (err) {
    console.error("Welcome email failed to send:", err);
    await logSecurityEvent(req, "USER_REGISTERED_EMAIL_FAILED", newUser.id);
  }

  sendResponse(
    res,
    201,
    "User registered successfully. MFA setup will be required on first login.",
    { user: userWithData }
  );
});
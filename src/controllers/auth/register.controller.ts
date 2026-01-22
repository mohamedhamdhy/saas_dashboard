// MODULE: User Onboarding Controller
// Handles identity creation, role-based access assignment, and organization (tenant) linking.

// HEADER: Imports & Setup
import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { User, Role, Organization } from "../../../models/index";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { logSecurityEvent } from "../../utils/logger";
import { sendEmail } from "../../utils/email";
import { sendResponse } from "../../utils/sendResponse";

/**
 * HEADER: User Registration Handler
 * API: Creates a new user profile and sends a welcome notification.
 * SECURITY: Enforces role validation and organization existence checks.
 */
export const register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, roleName, organizationName, phoneNumber } = req.body;

  // SECTION: Collision Check
  // SECURITY: Prevents duplicate account creation for the same email address.
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return next(new AppError("User with this email already exists", 400));
  }

  // SECTION: RBAC Validation
  // NOTE: Ensures the requested role exists in the database before proceeding.
  const role = await Role.findOne({ where: { name: roleName } });
  if (!role) {
    return next(new AppError(`Role '${roleName}' not found.`, 404));
  }

  // SECTION: Tenant (Organization) Linking
  // NOTE: Logic to ensure users (except Super Admins) belong to a valid Organization.
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

  // SECTION: Secure Persistence
  // CRYPTO: Standard bcrypt hashing with a salt cost of 12.
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

  // SECTION: Response Enrichment
  // NOTE: Re-fetching the user with joined data so the frontend can immediately cache the role/org.
  const userWithData = await User.findByPk(newUser.id, {
    include: [
      { model: Role, as: "role", attributes: ["name"] },
      { model: Organization, as: "organization", attributes: ["name", "email"] }
    ]
  });

  // SECTION: Notification Service
  // API: Building the onboarding email template.
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
    // NOTE: Transactional email for account confirmation.
    await sendEmail({
      email: newUser.email,
      subject: "Welcome & Security Setup Required",
      message: welcomeMessage,
    });

    // AUDIT: Permanent record of successful registration for compliance.
    await logSecurityEvent(req, "USER_REGISTERED_AND_NOTIFIED", newUser.id, { role: roleName });
  } catch (err) {
    // ERROR: Non-blocking catch. We don't want to fail the registration if only the email service is down.
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
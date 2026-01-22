// MODULE: Authentication & Identity Provider (IdP) Routes
// Provides endpoints for Lifecycle management (Register/Login), MFA, and Session Control.

// HEADER: Imports & Setup
import { Router } from "express";
import { login, register, logout } from "../controllers/auth/index";
import {
  setupMFA,
  activateMFA,
  verifyLoginMFA,
  disableMFA,
  verifyRecoveryCode
} from "../controllers/auth/mfa.controller";
import { refreshToken } from "../controllers/auth/refresh.controller";
import { forgotPassword, resetPassword } from "../controllers/auth/password.controller";
import { authMiddleware, roleMiddleware } from "../middleware/auth.middleware";
import { authLimiter, mfaLimiter } from "../../src/middleware/ratelimit.middlware";
import {
  validate,
  registerSchema,
  loginSchema,
  resetPasswordSchema
} from "../middleware/validation/validate.validation";

const router = Router();

// HEADER: Public & Onboarding Endpoints
// SECURITY: Registration is restricted to SUPER_ADMIN to prevent unauthorized tenant creation.
router.post("/register", authLimiter, authMiddleware, roleMiddleware(["SuperAdmin"]), validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);

// HEADER: Password Recovery Flow
router.post("/forgot-password", authLimiter, forgotPassword);
router.patch("/reset-password/:token", authLimiter, validate(resetPasswordSchema), resetPassword);

// HEADER: Token & Session Management
// NOTE: Refresh token does not require authMiddleware as it uses the Refresh Secret specifically.
router.post("/refresh-token", refreshToken);
router.post("/logout", authMiddleware, logout);

// HEADER: Multi-Factor Authentication (MFA)
// SECURITY: mfaLimiter protects against automated OTP brute-force attempts.
router.get("/mfa/setup", authMiddleware, setupMFA);
router.post("/mfa/activate", authMiddleware, mfaLimiter, activateMFA);
router.post("/mfa/disable", authMiddleware, disableMFA);
router.post("/mfa/verify-login", mfaLimiter, verifyLoginMFA);
router.post("/mfa/recovery-login", mfaLimiter, verifyRecoveryCode);

export default router;
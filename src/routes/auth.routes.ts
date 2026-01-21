import { Router } from "express";
import { login, register, logout } from "../controllers/auth/index";
import {
  setupMFA,
  activateMFA,
  verifyLoginMFA,
  disableMFA,
  verifyRecoveryCode
} from "../controllers/auth/mfa.controller";
import {
  getActiveSessions,
  revokeAllSessions,
  revokeSession
} from "../controllers/auth/user.controller";
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

router.post("/register", authLimiter, authMiddleware, roleMiddleware(["SUPER_ADMIN"]), validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);

router.post("/forgot-password", authLimiter, forgotPassword);
router.patch("/reset-password/:token", authLimiter, validate(resetPasswordSchema), resetPassword);

router.post("/refresh-token", refreshToken);
router.post("/logout", authMiddleware, logout);

router.get("/mfa/setup", authMiddleware, setupMFA);
router.post("/mfa/activate", authMiddleware, mfaLimiter, activateMFA);
router.post("/mfa/disable", authMiddleware, disableMFA);
router.post("/mfa/verify-login", mfaLimiter, verifyLoginMFA);
router.post("/mfa/recovery-login", mfaLimiter, verifyRecoveryCode);

router.get("/sessions/active", authMiddleware, getActiveSessions);
router.delete("/sessions/revoke-all", authMiddleware, revokeAllSessions);
router.delete("/sessions/revoke/:sessionId", authMiddleware, revokeSession);

export default router;
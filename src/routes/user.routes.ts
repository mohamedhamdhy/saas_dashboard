// MODULE: User Account & Administration System
// Provides endpoints for self-service profile updates, security management, and administrative CRUD.

// HEADER: Imports & Setup
import { Router } from "express";
import {
  getMe,
  updateMe,
  updateMyPassword,
  getAllUsers,
  updateUser,
  deleteUser,
  getActiveSessions,
  revokeAllSessions,
  revokeSession
} from "../controllers/auth/user.controller";
import { authMiddleware, roleMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation/validate.validation";
import {
  adminActionLimiter,
  sensitiveActionLimiter,
  apiLimiter
} from "../middleware/ratelimit.middlware";
import {
  updateMeSchema,
  updatePasswordSchema,
  adminUpdateUserSchema
} from "../middleware/validation/user.validation";
import { RoleName } from "../../models/role";

const router = Router();

// HEADER: Global Middleware (Safety Net)
// SECURITY: Every route in this file requires a valid session and is rate-limited.
router.use(apiLimiter);
router.use(authMiddleware);

// HEADER: Self-Service Profile Management
// API: Allows the logged-in user to retrieve and update their own basic information.
router.get("/me", getMe);
router.patch("/updateMe", validate(updateMeSchema), updateMe);

// HEADER: Security & Credentials
// SECURITY: Uses sensitiveActionLimiter to prevent automated password-guessing or session-flooding.
router.patch("/updateMyPassword", sensitiveActionLimiter, validate(updatePasswordSchema), updateMyPassword);

// HEADER: Session Auditing
// NOTE: Users can monitor and kill remote sessions (useful if a device is stolen).
router.get("/sessions", getActiveSessions);
router.delete("/sessions/revoke-all", sensitiveActionLimiter, revokeAllSessions);
router.delete("/sessions/revoke/:sessionId", sensitiveActionLimiter, revokeSession);

// HEADER: Administrative Operations
// SECURITY: Restricted to SuperAdmin and Admin roles only.
router.get("/", roleMiddleware([RoleName.SuperAdmin, RoleName.Admin]), getAllUsers);

// SECURITY: Destructive or privileged updates are restricted exclusively to SuperAdmin.
// PERF: adminActionLimiter prevents mass-deletion or mass-modification scripts.
router.patch("/:id", roleMiddleware([RoleName.SuperAdmin]), adminActionLimiter, validate(adminUpdateUserSchema), updateUser);
router.delete("/:id", roleMiddleware([RoleName.SuperAdmin]), adminActionLimiter, deleteUser);

export default router;
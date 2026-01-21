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

const router = Router();

router.use(apiLimiter);
router.use(authMiddleware);

router.get("/me", getMe);
router.patch("/updateMe", validate(updateMeSchema), updateMe);

router.patch(
  "/updateMyPassword",
  sensitiveActionLimiter,
  validate(updatePasswordSchema),
  updateMyPassword
);

router.get("/sessions", getActiveSessions);
router.delete("/sessions/revoke-all", sensitiveActionLimiter, revokeAllSessions);
router.delete("/sessions/revoke/:sessionId", sensitiveActionLimiter, revokeSession);

router.get("/", roleMiddleware(["SUPER_ADMIN", "ADMIN"]), getAllUsers);

router.patch("/:id", roleMiddleware(["SUPER_ADMIN"]), adminActionLimiter, validate(adminUpdateUserSchema), updateUser);

router.delete("/:id", roleMiddleware(["SUPER_ADMIN"]), adminActionLimiter, deleteUser);

export default router;
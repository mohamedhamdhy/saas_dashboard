import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  getMe,
  updateMe,
  updateMyPassword,
  getAllUsers
} from "../controllers/auth/user.controller";
import { authMiddleware, roleMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation/validate.validation";
import { updateMeSchema, updatePasswordSchema } from "../middleware/validation/user.validation";

const router = Router();

const sensitiveActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many attempts from this IP, please try again after an hour"
});

router.use(authMiddleware);

router.get("/me", getMe);

router.patch(
  "/updateMe",
  validate(updateMeSchema),
  updateMe
);

router.patch(
  "/updateMyPassword",
  sensitiveActionLimiter,
  validate(updatePasswordSchema),
  updateMyPassword
);

router.get(
  "/",
  roleMiddleware(["SUPER_ADMIN", "ADMIN"]),
  getAllUsers
);

export default router;
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleMiddleware } from "../middleware/role.middleware";
import { User } from "../models/user.model";

const router = Router();

router.get(
  "/",
  authMiddleware,
  roleMiddleware(["SUPER_ADMIN", "ADMIN"]),
  async (_, res) => {
    const users = await User.findAll();
    res.json(users);
  }
);


export default router;

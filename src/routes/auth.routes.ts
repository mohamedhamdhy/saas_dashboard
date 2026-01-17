import { Router } from "express";
import { register, login } from "../controllers/auth.controller";

/**
 * 1. Initialize the Router
 * The Router is a mini-app that only handles a specific subset of routes.
 * This keeps our main server file clean and organized.
 */
const router = Router();

/**
 * 2. Define the Register Route
 * METHOD: POST
 * PATH: /register (Relative to where this router is mounted)
 * HANDLER: The 'register' function from our controller.
 */
router.post("/register", register);

/**
 * 3. Define the Login Route
 * METHOD: POST
 * PATH: /login
 * HANDLER: The 'login' function from our controller.
 */
router.post("/login", login);

/**
 * 4. Export the Router
 * We export it so we can "mount" it in our main app file (usually server.ts).
 */
export default router;
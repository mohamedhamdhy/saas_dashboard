import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleMiddleware } from "../middleware/role.middleware";
import { User } from "../models/user.model";

/**
 * 1. Initialize the Router
 * This router will handle all user-related requests, such as listing or updating users.
 */
const router = Router();

/**
 * 2. Protected Route: Get All Users
 * This route uses a "Chain of Responsibility" pattern:
 * - First, it checks if the user is logged in (authMiddleware).
 * - Second, it checks if the logged-in user has the right role (roleMiddleware).
 * - Finally, if both pass, it executes the logic to fetch data.
 */
router.get(
  "/",                         // Path: GET / (if mounted at /api/users, this is the full path)
  authMiddleware,              // Step 1: Verify JWT token
  roleMiddleware(["SUPER_ADMIN", "ADMIN"]), // Step 2: Verify role is either SUPER_ADMIN or ADMIN
  async (_, res) => {          // Step 3: Logic (using '_' because we don't need the 'req' object here)
    try {
      // 3. Use Sequelize to find all records in the 'users' table
      const users = await User.findAll({
        attributes: { exclude: ['password'] } // Security tip: Never send passwords back to the client!
      });
      
      // 4. Send the list of users back as JSON
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: "Error fetching users" });
    }
  }
);

/**
 * 5. Export the Router
 * This will be imported into your main server file.
 */
export default router;
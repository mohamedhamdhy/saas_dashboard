import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

/**
 * 1. Higher-Order Function
 * We use a function that returns another function. 
 * This allows us to pass configuration (the allowed roles) when we define the route.
 * * @param roles - An array of strings representing permitted roles (e.g., ['admin', 'manager'])
 */
export const roleMiddleware = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    
    /**
     * 2. Permission Check
     * We check two things:
     * a) Does req.user exist? (Ensures authMiddleware was run before this)
     * b) Is the user's role included in the list of allowed roles?
     */
    if (!req.user || !roles.includes(req.user.role)) {
      // 403 Forbidden means: "I know who you are, but you don't have permission for this."
      return res.status(403).json({ message: "Forbidden: Access denied" });
    }

    // 3. Success! The user has the required role.
    next();
  };
};
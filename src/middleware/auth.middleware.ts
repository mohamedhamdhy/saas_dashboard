import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Use the same secret key used to sign the tokens in the login controller
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

/**
 * 1. Type Extension
 * By default, Express 'Request' doesn't have a 'user' property.
 * We extend it so we can attach the logged-in user's info to the request object.
 */
export interface AuthRequest extends Request {
  user?: { id: number; role: string };
}

/**
 * 2. The Middleware Function
 * It checks the 'Authorization' header for a valid Bearer token.
 */
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Extract token from header: "Bearer <token_string>"
  // .split(" ")[1] gets the part after the space
  const token = req.headers.authorization?.split(" ")[1];

  // If no token is provided, stop here and return 'Unauthorized'
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    /**
     * 3. Verify the Token
     * This checks if the token was signed by our server and hasn't expired.
     * We cast it to 'any' temporarily to access the custom 'id' and 'role' properties.
     */
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // 4. Attach user info to the request so the next function can use it
    req.user = { id: decoded.id, role: decoded.role };

    // 5. Success! Move to the next function (the actual route logic)
    next();
  } catch (err) {
    // If the token is tampered with or expired, catch the error
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
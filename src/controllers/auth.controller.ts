import { Request, Response } from "express";
import { User } from "../models/user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Load the secret key for signing tokens; fallback to a string for development
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

/**
 * REGISTER: Creates a new user account
 */
export const register = async (req: Request, res: Response) => {
  // 1. Destructure data from the incoming request body
  const { name, email, password, role } = req.body;

  try {
    // 2. Check if the user already exists to prevent duplicate emails
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // 3. Hash the password (never store raw passwords in the database!)
    // The '10' is the saltRounds, which determines the hashing complexity
    const hashed = await bcrypt.hash(password, 10);

    // 4. Create the record in the PostgreSQL database
    const user = await User.create({ name, email, password: hashed, role });

    // 5. Respond with the new user data (excluding the password for security)
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: "Server error during registration" });
  }
};

/**
 * LOGIN: Verifies credentials and returns a token
 */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // 1. Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 2. Compare the provided password with the hashed password in the DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    /**
     * 3. Create a JSON Web Token (JWT)
     * This token contains the user's ID and Role.
     * The client will send this token back in the header for protected routes.
     */
    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: "1d" } // Token expires in 1 day
    );

    // 4. Send the token to the client
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Server error during login" });
  }
};
import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";

// 1. Load environment variables (.env) into the application
dotenv.config();

// 2. Initialize the Express application instance
const app = express();

/**
 * 3. Global Middleware
 * express.json() is a built-in middleware that parses incoming 
 * requests with JSON payloads. Without this, 'req.body' would be undefined.
 */
app.use(express.json());

/**
 * 4. Database Connection
 * Triggers the authentication and synchronization logic 
 * defined in your 'db.ts' file.
 */
connectDB();

/**
 * 5. Route Mounting
 * We "prefix" our routes here. 
 * - All routes inside 'authRoutes' will now start with /api/auth
 * - All routes inside 'userRoutes' will now start with /api/users
 */
app.use("/api/auth", authRoutes); // Example: POST /api/auth/register
app.use("/api/users", userRoutes); // Example: GET /api/users/

/**
 * 6. Export the App
 * We export 'app' so it can be imported by a 'server.ts' file (to start the listener)
 * or by testing frameworks like Jest/Supertest.
 */
export default app;
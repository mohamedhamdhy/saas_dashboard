// MODULE: Express Application Configuration
// HEADER: Imports & Setup
import express, { Application, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db";
import { AppError } from "./utils/appError";
import { globalErrorHandler } from "./middleware/error.middleware";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import { apiLimiter } from "./middleware/ratelimit.middlware";

dotenv.config();

const app: Application = express();

// HEADER: Infrastructure & Proxy Settings
// FIX: Required for rate-limiting when behind a load balancer (Nginx, Heroku, AWS).
// NOTE: Setting to 1 means 'trust the first hop'. This ensures req.ip is the actual client IP.
app.set("trust proxy", 1);

// HEADER: Security Middleware
// SECURITY: Adds essential HTTP headers to prevent XSS and Clickjacking.
app.use(helmet());

// SECURITY: Dynamic CORS configuration to restrict cross-origin access.
const allowedOrigins = [
    "http://localhost:3000",
    "https://your-saas-dashboard.com"
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = "The CORS policy for this site does not allow access from the specified Origin.";
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
}));

// HEADER: Global Rate Limiting
// SECURITY: Applied early in the stack to drop malicious traffic before it hits the DB.
app.use("/api", apiLimiter);

// HEADER: Request Parsing
// PERF: Strict body limits (10kb) prevent 'Payload Too Large' (DoS) attacks.
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// HEADER: Database & Routing
// NOTE: Authenticate DB connection before accepting traffic.
connectDB();

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);

// HEADER: Error Handling Pipeline
// API: Catch-all for undefined routes.
app.all("*", (req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// NOTE: Global error handler must be the last middleware in the stack.
app.use(globalErrorHandler);

export default app;
import express, { Application, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import { globalErrorHandler } from "./middleware/error.middleware";
import { AppError } from "./utils/appError";
import { apiLimiter, authLimiter } from "./middleware/ratelimit.middlware";

dotenv.config();

const app: Application = express();

app.use(helmet());

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
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
}));

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.use("/api", apiLimiter);

connectDB();

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/mfa/activate", authLimiter);
app.use("/api/auth/mfa/verify-login", authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.all("*", (req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;
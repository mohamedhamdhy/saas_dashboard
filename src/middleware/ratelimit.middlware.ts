import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: "Too many authentication attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many MFA attempts. Access locked for 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const sensitiveActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Security limit reached for sensitive actions. Try again in an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const adminActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many administrative actions. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const heavyOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { message: "Export limit reached. Please try again in an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});
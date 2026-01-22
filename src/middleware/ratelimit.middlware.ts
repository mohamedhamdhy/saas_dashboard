// MODULE: Request Throttling & Security Defense
// Provides multi-layered rate limiting to prevent abuse and ensure system stability.

// HEADER: Imports
import rateLimit from "express-rate-limit";

// HEADER: General API Limiter
// NOTE: Protects standard resource endpoints (GET/POST) from accidental or malicious flooding.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// HEADER: Authentication Brute-Force Guard
// SECURITY: Strictly limits login attempts. 
// NOTE: 'skipSuccessfulRequests' allows users to login once without consuming their quota.
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 10, 
  message: { message: "Too many authentication attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, 
});

// HEADER: Multi-Factor Authentication (MFA) Guard
// SECURITY: Prevents automated OTP guessing. Access is restricted quickly due to high sensitivity.
export const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: { message: "Too many MFA attempts. Access locked for 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// HEADER: Sensitive Action Guard
// SECURITY: Applied to destructive actions like 'Change Password' or 'Delete Account'.
export const sensitiveActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 5,
  message: { message: "Security limit reached for sensitive actions. Try again in an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

// HEADER: Administrative Action Guard
// NOTE: Protects high-impact endpoints like 'Invite User' or 'Change Organization Settings'.
export const adminActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20,
  message: { message: "Too many administrative actions. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// HEADER: Resource-Intensive Operation Guard
// PERF: Applied to expensive DB queries or PDF/CSV exports to prevent server memory exhaustion.
export const heavyOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 3,
  message: { message: "Export limit reached. Please try again in an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});
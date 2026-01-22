// MODULE: Authentication Token Service
// Responsibile for signing and issuing JSON Web Tokens (JWT) for session management.

// HEADER: Imports & Setup
import jwt from "jsonwebtoken";
import { User } from "../../models/index";

// SECURITY: Fallback secrets are provided for development, but environment variables are mandatory for production.
const ACCESS_SECRET = process.env.JWT_SECRET || "access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret";

/**
 * HEADER: Dual-Token Generation Utility
 * @param user - The User model instance containing identity and authorization data.
 * @returns An object containing the short-lived Access Token and long-lived Refresh Token.
 */
export const generateTokens = (user: User) => {
  // NOTE: Type casting to 'any' to handle dynamic role/association data during the signing process.
  const userData = user as any;

  // SECTION: Access Token Payload
  // SECURITY: Contains minimal identity data + authorization claims (RBAC).
  // PERF: Short expiry (15m) minimizes the window of opportunity if a token is intercepted.
  const accessTokenPayload = {
    id: user.id,
    role: userData.role?.name || userData.roleName || "USER",
    organizationId: userData.organizationId,
    tokenVersion: userData.tokenVersion // FIX: Essential for remote logout/session revocation.
  };

  // SECTION: Refresh Token Payload
  // NOTE: Contains only the identifiers needed to issue a new Access Token.
  const refreshTokenPayload = {
    id: user.id,
    tokenVersion: userData.tokenVersion
  };

  // EXECUTION: Digital Signing
  // API: Issuing the Access Token for API authorization.
  const accessToken = jwt.sign(
    accessTokenPayload,
    ACCESS_SECRET,
    { expiresIn: "15m" }
  );

  // API: Issuing the Refresh Token for session persistence (7-day lifecycle).
  const refreshToken = jwt.sign(
    refreshTokenPayload,
    REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};
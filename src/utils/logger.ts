// MODULE: Security Forensics & Audit Logging
// Provides an immutable record of sensitive system actions for compliance and security monitoring.

// HEADER: Imports
import { Request } from "express";
import { AuditLog } from "../../models/auditLogs";

/**
 * HEADER: Security Event Logger
 * @param req - The Express Request object to extract network metadata.
 * @param action - A descriptive string of the event (e.g., 'PASSWORD_CHANGE', 'MFA_DISABLED').
 * @param userId - The UUID of the user performing the action (null for public events like failed logins).
 * @param metadata - Optional JSON object containing non-sensitive contextual data.
 */
export const logSecurityEvent = async (
  req: Request,
  action: string,
  userId: string | null = null,
  metadata: any = {}
) => {
  try {
    // SECTION: Database Record Creation
    await AuditLog.create({
      userId,
      action,
      // SECURITY: Multi-layered IP detection to handle Proxies and Load Balancers (like Cloudflare/Nginx).
      ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      metadata
    });
  } catch (error) {
    // NOTE: We use console.error here because an audit log failure should NOT crash the main request.
    // However, in production, this should trigger an alert in your monitoring system (e.g., Sentry).
    console.error("❌ CRITICAL: Failed to save audit log:", error);
  }
};
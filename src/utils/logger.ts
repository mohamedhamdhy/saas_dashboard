import { Request } from "express";
import { AuditLog } from "../../models/auditLog";

export const logSecurityEvent = async (
  req: Request,
  action: string,
  userId: string | null = null,
  metadata: any = {}
) => {
  try {
    await AuditLog.create({
      userId,
      action,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      metadata
    });
  } catch (error) {
    console.error("Failed to save audit log:", error);
  }
};
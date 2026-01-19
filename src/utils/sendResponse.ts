import { Response } from "express";

/**
 * Standardizes all successful API responses
 * @param res Express response object
 * @param statusCode HTTP status code (200, 201, etc.)
 * @param message Human-readable message
 * @param data The actual payload (user, tokens, etc.)
 */

export const sendResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data: any = null
) => {
  res.status(statusCode).json({
    status: "success",
    message,
    results: Array.isArray(data) ? data.length : undefined,
    data: data || undefined
  });
};
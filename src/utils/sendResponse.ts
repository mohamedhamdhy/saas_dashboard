// MODULE: Global Response Normalizer
// Provides a unified JSON structure for all successful API operations.

// HEADER: Imports
import { Response } from "express";

/**
 * HEADER: Success Response Dispatcher
 * @param res - The Express Response object.
 * @param statusCode - HTTP Status Code (e.g., 200 for OK, 201 for Created).
 * @param message - A brief description of the result for frontend toast/notifications.
 * @param data - The payload. Supports Objects, Arrays, or Null.
 */
export const sendResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data: any = null
) => {
  // SECTION: Response Construction
  // API: Consistently returns 'status: success' to allow easy filtering in frontend interceptors.
  res.status(statusCode).json({
    status: "success",
    message,
    
    // PERF: 'results' only appears if data is an array. 
    // NOTE: This is extremely helpful for frontend pagination and list counters.
    results: Array.isArray(data) ? data.length : undefined,

    // API: If data is null/empty, we omit the key to keep the payload clean.
    data: data || undefined
  });
};
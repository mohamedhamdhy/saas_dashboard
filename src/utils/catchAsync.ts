// MODULE: Asynchronous Error Boundary
// Provides a wrapper for async middleware to ensure all rejected promises are piped to the Global Error Handler.

// HEADER: Imports
import { Request, Response, NextFunction } from "express";

/**
 * HEADER: Functional Wrapper Implementation
 * @param fn - An asynchronous Express controller function (req, res, next).
 * @returns A standard Express middleware that catches internal errors automatically.
 * * NOTE: This eliminates the "Try-Catch" boilerplate in controllers, 
 * maintaining the DRY (Don't Repeat Yourself) principle.
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // SECURITY: The .catch(next) is critical. It passes any error 
    // directly to the 'globalErrorHandler' middleware.
    fn(req, res, next).catch(next);
  };
};
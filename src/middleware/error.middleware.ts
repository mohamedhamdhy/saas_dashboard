// MODULE: Centralized Error Dispatcher
// Provides a unified interface for transforming raw exceptions into structured API responses.

// HEADER: Imports & Internal Handlers
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError";
import { ZodError, ZodIssue } from "zod"; 

// SECURITY: Specialized handlers for JWT exceptions
const handleJWTError = () =>
  new AppError("Invalid token. Please log in again.", 401);

const handleJWTExpiredError = () =>
  new AppError("Your session has expired. Please log in again.", 401);

// FIX: Structured Zod Error Formatter
// NOTE: We use 'issues' instead of 'errors' to align with Zod's core Type definitions.
const handleZodError = (err: ZodError) => {
  // FIX: Explicitly typing 'e' as ZodIssue to resolve TS7006
  const details = err.issues.map((e: ZodIssue) => ({
    field: e.path[e.path.length - 1],
    message: e.message,
  }));
  
  const message = `Validation failed: ${details.map((e) => e.field).join(', ')}`;
  const appErr = new AppError(message, 400);
  
  // PERF: Attaching structured details for the frontend.
  (appErr as any).details = details; 
  return appErr;
};

// HEADER: Primary Error Middleware
export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // HEADER: Environment-Specific Responses
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
      // FIX: Use err.issues for ZodErrors in development logs
      details: err.details || (err instanceof ZodError ? err.issues : null)
    });
  } else {
    // HEADER: Production Data Sanitization
    let error = { ...err };
    error.message = err.message;

    // FIX: Standardizing Third-Party Errors
    // NOTE: We check instanceof ZodError BEFORE checking isOperational.
    if (err instanceof ZodError) error = handleZodError(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    // SECURITY: Operational errors are safe to show to the client.
    if (error.isOperational) {
      return res.status(error.statusCode).json({
        status: error.status,
        message: error.message,
        ...(error.details && { errors: error.details })
      });
    }

    // FIX: Internal Monitoring
    console.error('ERROR 💥', err);
    
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }
};
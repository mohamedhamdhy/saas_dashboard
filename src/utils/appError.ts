// MODULE: Advanced Application Error Utility
// HEADER: Class Implementation
export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;
  // PERF: Added optional details property to hold structured error data (e.g., Zod field errors)
  public details?: any[];

  /**
   * @param message - The human-readable error description.
   * @param statusCode - The HTTP status code.
   * @param details - Optional array for structured error reporting (field-level errors).
   */
  constructor(message: string, statusCode: number, details?: any[]) {
    // HEADER: Parent Initialization
    super(message);

    // STATE: Property Assignment
    this.statusCode = statusCode;
    this.details = details;
    
    // API: Logic for fail (4xx) vs error (5xx)
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    // SECURITY: Flags this as an "expected" error for the Global Handler.
    this.isOperational = true;

    // FIX: Cleaner stack traces for debugging.
    Error.captureStackTrace(this, this.constructor);
  }
}
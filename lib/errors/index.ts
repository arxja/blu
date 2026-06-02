import { logger } from "@/lib/logger"; 

export const ErrorCodes = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class AppError extends Error {
  public statusCode: number;
  public errorCode: ErrorCode;
  public isOperational: boolean;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    isOperational: boolean = true,
    details?: any,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;
    this.name = "AppError";

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Auto-log based on error type
    if (isOperational) {
      logger.warn({
        message: this.message,
        code: this.errorCode,
        statusCode: this.statusCode,
        details: this.details,
        stack: this.stack,
      });
    } else {
      logger.error({
        message: this.message,
        code: this.errorCode,
        statusCode: this.statusCode,
        details: this.details,
        stack: this.stack,
      });
    }
  }

  // Static factory methods
  static badRequest(message: string, details?: any) {
    return new AppError(message, 400, ErrorCodes.BAD_REQUEST, true, details);
  }

  static unauthorized(message: string = "Unauthorized") {
    return new AppError(message, 401, ErrorCodes.UNAUTHORIZED, true);
  }

  static forbidden(message: string = "Forbidden") {
    return new AppError(message, 403, ErrorCodes.FORBIDDEN, true);
  }

  static notFound(message: string = "Resource not found") {
    return new AppError(message, 404, ErrorCodes.NOT_FOUND, true);
  }

  static conflict(message: string = "Conflict") {
    return new AppError(message, 409, ErrorCodes.CONFLICT, true);
  }

  static rateLimited(message: string = "Too many requests") {
    return new AppError(message, 429, ErrorCodes.RATE_LIMITED, true);
  }

  static internal(message: string = "Internal server error") {
    return new AppError(message, 500, ErrorCodes.INTERNAL_ERROR, false);
  }
}

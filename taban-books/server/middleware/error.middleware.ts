/**
 * Error Middleware
 * Central error handler
 */

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/debug.js";
import fs from "fs";
import path from "path";

// Ensure fetch is available (Node.js 18+ has it built-in)
declare const fetch: typeof globalThis.fetch;

interface ErrorWithStatus {
  message: string;
  status?: number;
  statusCode?: number;
  name?: string;
  code?: number;
  keyPattern?: Record<string, any>;
  errors?: Record<string, { message: string }>;
  stack?: string;
  toString?: () => string;
}

/**
 * 404 Not Found handler
 */
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new Error(`Not Found - ${req.originalUrl}`) as ErrorWithStatus;
  error.statusCode = 404;
  error.status = 404;
  res.status(404);
  next(error);
};

/**
 * Error handler
 */
export const errorHandler = (
  err: ErrorWithStatus | Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error: ErrorWithStatus = {
    ...(err as ErrorWithStatus),
    message: err.message || "Server Error",
  };


  // Log error with debug utility
  try {
    logError(err, {
      url: _req.originalUrl || _req.url,
      method: _req.method,
      user: _req.user,
    });
  } catch (logError) {
    // If logError fails, just continue
  }

  // Also log to console for immediate visibility
  console.error("Error:", err);
  
  // Custom file log for debugging
  try {
    const logPath = path.join(process.cwd(), 'debug-errors.log');
    const logLine = `[${new Date().toISOString()}] ${err.name}: ${err.message}\nStack: ${err.stack}\nURL: ${_req.method} ${_req.originalUrl}\n\n`;
    fs.appendFileSync(logPath, logLine);
  } catch (e) {}

  if (err.stack) {
    console.error("Stack:", err.stack);
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = { ...error, message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern || {})[0] || 'field';
    const message = `${field} already exists`;
    error = { ...error, message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = (err as any).errors;
    const message = errors
      ? Object.values(errors).map((val: any) => val.message).join(", ")
      : err.message;
    error = { ...error, message, statusCode: 400 };
  }

  // Ensure we always send JSON
  const statusCode = error.statusCode || (res.statusCode === 200 ? 500 : res.statusCode) || 500;
  const response: any = {
    success: false,
    message: error.message || err.message || "Server Error",
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
    response.error = err.toString();
  }

  // Make sure response hasn't been sent
  if (!res.headersSent) {
    res.status(statusCode).json(response);
  } else {
    console.error("Response already sent, cannot send error response");
  }
};


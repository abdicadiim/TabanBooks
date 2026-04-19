/**
 * Async Handler Utility
 * Wraps async route handlers to catch errors and pass them to error middleware
 */

import { Request, Response, NextFunction } from "express";

type AsyncFunction = (req: Request, res: Response, next?: NextFunction) => Promise<any>;

export const asyncHandler = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Ensure error is passed to error middleware
      next(error);
    });
  };
};

export default asyncHandler;

/**
 * Validation Middleware
 * Request validation
 */

import { Request, Response, NextFunction } from "express";
import { Schema } from "joi";

interface ValidationOptions {
  stripUnknown?: boolean;
}

/**
 * Validate request body
 */
export const validate = (schema: Schema, options: ValidationOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: options.stripUnknown ?? true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
      return;
    }

    req.body = value;
    next();
  };
};

export default { validate };

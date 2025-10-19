import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateAsync } from '../utils/validators';

/**
 * Validation middleware factory
 */
export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const result = await validateAsync(schema, req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.errors,
      });
      return;
    }

    req.body = result.data;
    next();
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const result = await validateAsync(schema, req.query);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.errors,
      });
      return;
    }

    req.query = result.data as any;
    next();
  };
};

/**
 * Validate route parameters
 */
export const validateParams = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const result = await validateAsync(schema, req.params);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.errors,
      });
      return;
    }

    req.params = result.data as any;
    next();
  };
};
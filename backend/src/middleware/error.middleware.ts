import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Global error handler
 */
export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', error);

  let statusCode = 500;
  let message = 'Internal server error';

  if (error.message.includes('Invalid credentials')) {
    statusCode = 401;
    message = error.message;
  } else if (error.message.includes('not found')) {
    statusCode = 404;
    message = error.message;
  } else if (error.message.includes('already exists') || error.message.includes('already registered')) {
    statusCode = 409;
    message = error.message;
  } else if (error.message.includes('Invalid') || error.message.includes('required')) {
    statusCode = 400;
    message = error.message;
  } else if (error.message.includes('Unauthorized') || error.message.includes('disabled')) {
    statusCode = 401;
    message = error.message;
  } else if (error.message.includes('Forbidden')) {
    statusCode = 403;
    message = error.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};

/**
 * Async handler wrapper to catch errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
import type { Request, Response, NextFunction } from 'express';

/**
 * Global error handler
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('❌ Unhandled error:', err);

  const status = (err as any).status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@auto-code/database';

/**
 * Simple API key auth middleware.
 * Pass API key in header: `Authorization: Bearer <API_KEY>`
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const apiKey = authHeader.slice(7); // remove "Bearer "

    const user = await prisma.user.findUnique({
      where: { apiKey },
      select: { id: true, email: true, name: true, plan: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    // Attach user to request
    (req as any).user = user;
    next();
  } catch (err) {
    next(err);
  }
}

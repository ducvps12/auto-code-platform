import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@auto-code/database';
import { signAccessToken, signRefreshToken, verifyToken, getRefreshExpiry } from '../utils/jwt.js';

export const authRouter = Router();

// ============ SCHEMAS ============
const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  name: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// ============ POST /auth/register ============
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const body = registerSchema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: { email: body.email, passwordHash, name: body.name },
      select: { id: true, email: true, name: true, plan: true, apiKey: true, createdAt: true },
    });

    const accessToken = signAccessToken({ userId: user.id, email: user.email, plan: user.plan });
    const refreshToken = signRefreshToken(user.id);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: getRefreshExpiry(),
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
      },
    });

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ POST /auth/login ============
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ error: 'Account disabled' });

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = signAccessToken({ userId: user.id, email: user.email, plan: user.plan });
    const refreshToken = signRefreshToken(user.id);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: getRefreshExpiry(),
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
      },
    });

    res.json({
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan, apiKey: user.apiKey },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ POST /auth/refresh ============
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const session = await prisma.session.findUnique({ where: { refreshToken }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = session.user;
    const newAccessToken = signAccessToken({ userId: user.id, email: user.email, plan: user.plan });
    const newRefreshToken = signRefreshToken(user.id);

    // Rotate refresh token
    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: newRefreshToken, expiresAt: getRefreshExpiry() },
    });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ GET /auth/me (requires JWT) ============
authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token required' });

    const payload = verifyToken(authHeader.slice(7));
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, avatarUrl: true, plan: true, apiKey: true, isActive: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user });
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Invalid or expired token' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ POST /auth/logout ============
authRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.session.deleteMany({ where: { refreshToken } });
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

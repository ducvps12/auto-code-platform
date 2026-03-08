import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'aCi-s3cr3t-k3y-pr0d-2026-x7m9q';
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

export interface JwtPayload {
  userId: string;
  email: string;
  plan: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function getRefreshExpiry(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

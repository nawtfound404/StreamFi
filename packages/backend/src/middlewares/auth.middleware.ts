// packages/backend/src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { logger } from '../utils/logger';
import { UserRole } from '@prisma/client'; // import the enum/type
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: { id: string; role: UserRole };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwt.secret) as { id: string; role: UserRole };
    // Enforce ban: check DB for banned flag
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, role: true, banned: true } });
    if (!user) return res.status(401).json({ message: 'Unauthorized: User not found' });
    if (user.banned) return res.status(403).json({ message: 'Account banned' });
    req.user = { id: user.id, role: user.role };

    next();
  } catch (error) {
    logger.error({ err: error }, 'Invalid token');
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

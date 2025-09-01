// packages/backend/src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { logger } from '../utils/logger';
import { UserRole } from '@prisma/client'; // import the enum/type

export interface AuthRequest extends Request {
  user?: { id: string; role: UserRole };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwt.secret) as { id: string; role: UserRole };
    req.user = { id: decoded.id, role: decoded.role };

    next();
  } catch (error) {
    logger.error({ err: error }, 'Invalid token');
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

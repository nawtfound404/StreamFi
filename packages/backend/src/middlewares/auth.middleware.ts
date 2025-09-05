// packages/backend/src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { logger } from '../utils/logger';
import { UserRole } from '../types/models';
import { connectMongo, UserModel } from '../lib/mongo';

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
    await connectMongo();
    const decoded = jwt.verify(token, env.jwt.secret) as { id: string; role: UserRole };
    // Enforce ban: check DB for banned flag
  const user: any = await UserModel.findById(decoded.id).select('role banned').lean();
  if (!user) return res.status(401).json({ message: 'Unauthorized: User not found' });
  if (user.banned) return res.status(403).json({ message: 'Account banned' });
  req.user = { id: String(user._id), role: user.role as UserRole };

    next();
  } catch (error) {
    logger.error({ err: error }, 'Invalid token');
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/models';

export function requireRole(...allowed: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as any).user?.role as UserRole | undefined;
    if (!role) return res.status(401).json({ message: 'Unauthorized' });
    if (!allowed.includes(role)) return res.status(403).json({ message: 'Forbidden' });
    return next();
  };
}

export const requireAdmin = requireRole(UserRole.ADMIN as unknown as UserRole, 'ADMIN' as any);
export const requireStreamer = requireRole(UserRole.STREAMER as unknown as UserRole, 'STREAMER' as any, 'streamer' as any);

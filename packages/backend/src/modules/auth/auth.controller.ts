// packages/backend/src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { logger } from '../../utils/logger';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;
  // Structured debug log (safe fields only). Remove or gate for production if noisy.
  logger.info({ email }, 'signup_request');
    const result = await authService.signupUser({ email, password, name });
  logger.info({ email, userId: result.user.id }, 'signup_success');
    res.status(201).json(result);
  } catch (error) {
  logger.warn({ err: (error as any)?.message, email: (req.body?.email) }, 'signup_failed');
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getUserById(req.user!.id);
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

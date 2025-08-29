import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.status(200).json(result);
  } catch (error) {
    // Pass error to the centralized error handler
    next(error);
  }
};

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;
    const result = await authService.signupUser({ email, password, name });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is attached by the authMiddleware
    const user = await authService.getUserById(req.user!.id);
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

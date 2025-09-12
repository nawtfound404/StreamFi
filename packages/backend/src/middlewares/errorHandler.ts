import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  const msg: string = err?.message || 'Something went wrong';
  let status = 500;
  // Simple heuristic mapping
  if (/invalid credentials/i.test(msg)) status = 401;
  else if (/unauthorized/i.test(msg)) status = 401;
  else if (/not found/i.test(msg)) status = 404;
  else if (/already in use|exists/i.test(msg)) status = 409;
  else if (/required|missing/i.test(msg)) status = 400;
  else if (/csrf/i.test(msg)) status = 403;
  logger.error({ err: msg, stack: err?.stack });
  res.status(status).json({ message: msg });
};

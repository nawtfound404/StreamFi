import { Request, Response } from 'express';
export const getNotifications = (_req: Request, res: Response) => res.status(200).json({ items: [] });
export const markRead = (_req: Request, res: Response) => res.status(200).json({ ok: true });

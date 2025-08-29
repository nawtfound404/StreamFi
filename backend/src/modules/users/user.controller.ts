import { Request, Response } from 'express';
export const getSettings = (_req: Request, res: Response) => res.status(200).json({ displayName: 'AliceStreamer', payoutEmail: 'alice-payout@example.com', about: 'Pro gamer' });
export const updateSettings = (_req: Request, res: Response) => res.status(200).json({ ok: true });

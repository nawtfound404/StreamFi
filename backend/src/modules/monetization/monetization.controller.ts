import { Request, Response } from 'express';
export const getSummary = (_req: Request, res: Response) => res.status(200).json({ totalDonations: 500, totalNftSales: 1200, totalPayouts: 800 });
export const getDonations = (_req: Request, res: Response) => res.status(200).json([]);
export const getNfts = (_req: Request, res: Response) => res.status(200).json([]);
export const getPayouts = (_req: Request, res: Response) => res.status(200).json([]);

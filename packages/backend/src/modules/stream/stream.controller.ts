import { Request, Response } from 'express';
export const getIngest = (_req: Request, res: Response) => res.status(200).json({ ingestUrl: 'rtmp://ingest.streamfi.io/live', streamKey: 'sk_demo_12345', status: 'idle' });
export const getStreamStatus = (req: Request, res: Response) => res.status(200).json({ id: req.params.id, status: 'live', viewers: 123, startedAt: new Date() });
export const getHls = (req: Request, res: Response) => {
	const url = `https://hls.streamfi.io/live/${req.params.id}/index.m3u8`;
	if (req.query.redirect) return res.redirect(302, url);
	return res.status(200).json({ hlsUrl: url });
};

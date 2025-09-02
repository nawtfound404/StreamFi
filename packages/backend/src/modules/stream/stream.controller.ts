import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/environment';
import crypto from 'crypto';
import { prisma as db } from '../../lib/prisma';

export const getIngest = async (req: Request, res: Response) => {
	// Issue or reuse a stream key for the authenticated streamer
	const userId = (req as any).user?.id as string | undefined;
	if (!userId) return res.status(401).json({ message: 'Unauthorized' });

	// Double-check ban status (in case of stale tokens)
	const user = await db.user.findUnique({ where: { id: userId } });
	if (!user || (user as any).banned) return res.status(403).json({ message: 'Account banned' });

	// Reuse existing active stream or create one
	let stream = await prisma.stream.findFirst({ where: { streamerId: userId } });
	if (!stream) {
		stream = await prisma.stream.create({ data: { title: 'My Stream', streamerId: userId, status: 'IDLE' } });
	}

	let streamKey = stream.streamKey;
	if (!streamKey) {
		streamKey = crypto.randomBytes(12).toString('hex');
		await prisma.stream.update({ where: { id: stream.id }, data: { streamKey, ingestUrl: env.nms.rtmpUrl } });
	}

	return res.status(200).json({ ingestUrl: env.nms.rtmpUrl, streamKey, status: stream.status.toLowerCase() });
};

export const getStreamStatus = (req: Request, res: Response) => res.status(200).json({ id: req.params.id, status: 'live', viewers: 123, startedAt: new Date() });

export const getHls = async (req: Request, res: Response) => {
	// Accept either stream id or stream key
	const idOrKey = req.params.id;
	const stream = await prisma.stream.findFirst({ where: { OR: [{ id: idOrKey }, { streamKey: idOrKey }] } });
	const keyForUrl = stream?.streamKey ?? idOrKey;
	const path = env.nms.hlsTemplate.replace('{key}', keyForUrl);
	const url = `${env.nms.hlsBase}${path}`;
	if (req.query.redirect) return res.redirect(302, url);
	return res.status(200).json({ hlsUrl: url });
};

import { Request, Response } from 'express';
import { connectMongo, StreamModel, UserModel } from '../../lib/mongo';
import { env } from '../../config/environment';
import crypto from 'crypto';
import { Types } from 'mongoose';

export const getIngest = async (req: Request, res: Response) => {
	// Issue or reuse a stream key for the authenticated streamer
	const userId = (req as any).user?.id as string | undefined;
	if (!userId) return res.status(401).json({ message: 'Unauthorized' });

	// Double-check ban status (in case of stale tokens)
		await connectMongo();
		const user = await UserModel.findById(userId).lean();
	if (!user || (user as any).banned) return res.status(403).json({ message: 'Account banned' });

	// Reuse existing active stream or create one
		let stream: any = await StreamModel.findOne({ streamerId: new Types.ObjectId(userId) }).lean();
		if (!stream) {
			const created = await StreamModel.create({ title: 'My Stream', streamerId: new Types.ObjectId(userId), status: 'IDLE' });
			stream = created.toObject();
		}

		let streamKey = (stream as any).streamKey as string | undefined;
	if (!streamKey) {
			streamKey = crypto.randomBytes(12).toString('hex');
			await StreamModel.updateOne({ _id: (stream as any)._id }, { $set: { streamKey, ingestUrl: env.nms.rtmpUrl } });
	}

	return res.status(200).json({ ingestUrl: env.nms.rtmpUrl, streamKey, status: String(stream.status || 'IDLE').toLowerCase() });
};

export const getStreamStatus = (req: Request, res: Response) => res.status(200).json({ id: req.params.id, status: 'live', viewers: 123, startedAt: new Date() });

export const getHls = async (req: Request, res: Response) => {
	// Accept either stream id or stream key
	const idOrKey = req.params.id;
	await connectMongo();
	const byId = Types.ObjectId.isValid(idOrKey) ? await StreamModel.findById(idOrKey).lean() : null;
	const stream = byId || (await StreamModel.findOne({ streamKey: idOrKey }).lean());
	if (!stream) return res.status(404).json({ message: 'Stream not found' });
	const keyForUrl = (stream as any)?.streamKey ?? idOrKey;
	const path = env.nms.hlsTemplate.replace('{key}', keyForUrl);
	const url = `${env.nms.hlsBase}${path}`;
	if (req.query.redirect) return res.redirect(302, url);
	return res.status(200).json({ hlsUrl: url });
};

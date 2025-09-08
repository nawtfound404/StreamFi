import { Request, Response } from 'express';
import { connectMongo, StreamModel, UserModel } from '../../lib/mongo';
import { env } from '../../config/environment';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { getRoomSize, emitToStreamRooms } from '../../lib/socket';

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

		return res.status(200).json({
			ingestUrl: env.nms.rtmpUrl,
			streamKey,
			streamId: String((stream as any)._id),
			status: String(stream.status || 'IDLE').toLowerCase(),
		});
};

	export const getStreamStatus = async (req: Request, res: Response) => {
		try {
			const idOrKey = req.params.id;
			await connectMongo();
			const byId = Types.ObjectId.isValid(idOrKey) ? await StreamModel.findById(idOrKey).lean() : null;
			const stream = byId || (await StreamModel.findOne({ streamKey: idOrKey }).lean());
			if (!stream) return res.status(404).json({ message: 'Stream not found' });

			const id = String((stream as any)._id);
			const key = (stream as any).streamKey as string | undefined;
			// Count both id and key rooms since clients may join either
			const viewers = getRoomSize(id) + (key && key !== id ? getRoomSize(key) : 0);
			return res.status(200).json({
				id,
				status: (stream as any).status || 'IDLE',
				viewers,
				startedAt: (stream as any).startedAt || null,
			});
		} catch (e) {
			return res.status(500).json({ message: 'Failed to fetch status' });
		}
	};

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

/** Manually mark a stream LIVE (UI toggle). Does not start media; RTMP publish still needed for video. */
export const startStream = async (req: Request, res: Response) => {
	try {
		const idOrKey = req.params.id;
		const uid = (req as any).user?.id as string | undefined;
		if (!uid) return res.status(401).json({ message: 'Unauthorized' });
		await connectMongo();
		const byId = Types.ObjectId.isValid(idOrKey) ? await StreamModel.findById(idOrKey) : null;
		const streamDoc = byId || (await StreamModel.findOne({ streamKey: idOrKey }));
		if (!streamDoc) return res.status(404).json({ message: 'Stream not found' });
		// Ownership check
		if (String((streamDoc as any).streamerId) !== String(uid)) return res.status(403).json({ message: 'Forbidden' });
		streamDoc.set({ status: 'LIVE', startedAt: new Date() });
		await streamDoc.save();
		emitToStreamRooms({ id: String((streamDoc as any)._id), key: (streamDoc as any).streamKey }, 'stream_status', { status: 'LIVE' });
		return res.json({ ok: true, status: 'LIVE' });
	} catch {
		return res.status(500).json({ message: 'Failed to start stream' });
	}
};

/** Manually mark a stream IDLE (UI toggle). Will also set endedAt. */
export const stopStream = async (req: Request, res: Response) => {
	try {
		const idOrKey = req.params.id;
		const uid = (req as any).user?.id as string | undefined;
		if (!uid) return res.status(401).json({ message: 'Unauthorized' });
		await connectMongo();
		const byId = Types.ObjectId.isValid(idOrKey) ? await StreamModel.findById(idOrKey) : null;
		const streamDoc = byId || (await StreamModel.findOne({ streamKey: idOrKey }));
		if (!streamDoc) return res.status(404).json({ message: 'Stream not found' });
		if (String((streamDoc as any).streamerId) !== String(uid)) return res.status(403).json({ message: 'Forbidden' });
		streamDoc.set({ status: 'IDLE', endedAt: new Date() });
		await streamDoc.save();
		emitToStreamRooms({ id: String((streamDoc as any)._id), key: (streamDoc as any).streamKey }, 'stream_status', { status: 'IDLE' });
		return res.json({ ok: true, status: 'IDLE' });
	} catch {
		return res.status(500).json({ message: 'Failed to stop stream' });
	}
};

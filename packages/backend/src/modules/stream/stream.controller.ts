import { Request, Response } from 'express';
import { connectMongo, StreamModel, UserModel } from '../../lib/mongo';
import { env } from '../../config/environment';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { getRoomSize, emitToStreamRooms } from '../../lib/socket';
import { ChannelModel } from '../../lib/mongo';
import { closeChannelCooperative } from '../../services/channel.service';
import { yellowService } from '../../services/yellow.service';

export const getIngest = async (req: Request, res: Response) => {
	// Issue or reuse a stream key for the authenticated streamer
	const userId = (req as any).user?.id as string | undefined;
	if (!userId) return res.status(401).json({ message: 'Unauthorized' });

	// Double-check ban status (in case of stale tokens)
		await connectMongo();
		const user = await UserModel.findById(userId).lean();
	if (!user || (user as any).banned) return res.status(403).json({ message: 'Account banned' });

  const forceNew = String(req.query.new||'').trim() === '1';
	// Reuse existing active stream or create one (allow forced creation via ?new=1)
	let stream: any = null;
	if (!forceNew) {
		stream = await StreamModel.findOne({ streamerId: new Types.ObjectId(userId) }).lean();
	}
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
	// Always build an externally-reachable URL under this host so nginx can proxy /live -> nms
	const path = `/live/${encodeURIComponent(keyForUrl)}/index.m3u8`;
	const origin = `${req.protocol}://${req.get('host')}`;
	const url = `${origin}${path}`;
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

		// Auto-close all channels for this stream (settle microtransactions to creator vault)
		try {
			const sid = String((streamDoc as any)._id);
			const openChannels = await ChannelModel.find({ streamId: sid, status: { $in: ['OPEN', 'CLOSING'] } }).lean();
			let closed = 0;
			for (const ch of openChannels) {
				try {
					// Cooperative close (includes deposit to vault and marks CLOSED)
					await closeChannelCooperative((ch as any).channelId);
					closed++;
					// If the channel was opened on-chain (openTxHash present), attempt on-chain close as well
					if ((ch as any).openTxHash) {
						const spent = BigInt((ch as any).spentWei || '0');
						try { await yellowService.closeChannel((ch as any).channelId, spent); } catch { /* non-fatal in stop */ }
					}
				} catch { /* continue with next channel */ }
			}
			return res.json({ ok: true, status: 'IDLE', channelsClosed: closed });
		} catch {
			// If settlement fails, still return success for stopping stream
			return res.json({ ok: true, status: 'IDLE', channelsClosed: 0 });
		}
	} catch {
		return res.status(500).json({ message: 'Failed to stop stream' });
	}
};

import { ethers } from 'ethers';
import { env } from '../config/environment';
import { ChannelModel, UserModel, StreamModel, connectMongo } from '../lib/mongo';
import { blockchainService } from './blockchain.service';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// EIP-712 domain & types for channel state
export const channelDomain = () => ({
  name: 'StreamFiChannel',
  version: '1',
  chainId: env.yellow.chainId,
  verifyingContract: env.yellow.channelContract,
});

export const channelTypes = {
  ChannelState: [
    { name: 'channelId', type: 'bytes32' },
    { name: 'vaultId', type: 'uint256' },
    { name: 'viewer', type: 'address' },
    { name: 'deposit', type: 'uint256' },
    { name: 'spent', type: 'uint256' },
    { name: 'nonce', type: 'uint64' },
  ],
} as const;

export interface ChannelStateStruct {
  channelId: string; // 0x bytes32
  vaultId: bigint;
  viewer: string;
  deposit: bigint;
  spent: bigint;
  nonce: bigint;
}

export function generateChannelId(viewer: string, streamId: string, vaultId: bigint): string {
  const preimage = ethers.solidityPacked(['address','bytes32','uint256'], [viewer.toLowerCase(), ethers.id(streamId), vaultId]);
  return ethers.keccak256(preimage);
}

export async function openChannel(params: { viewer: string; streamId: string; depositWei: bigint; forceNew?: boolean; forceSalt?: string }) {
  await connectMongo();
  const stream = await StreamModel.findById(params.streamId).lean();
  if (!stream) throw new Error('Stream not found');
  const streamer: any = await UserModel.findById((stream as any).streamerId).lean();
  if (!streamer) throw new Error('Streamer not found');
  if (!(streamer as any).vaultId) {
    // Attempt to discover/attach a vault id using on-chain state
    if ((streamer as any).walletAddress) {
      try {
        const owned = await blockchainService.getTokensByOwner((streamer as any).walletAddress);
        if (owned && owned.length > 0) {
          await UserModel.updateOne({ _id: (streamer as any)._id }, { $set: { vaultId: owned[0].toString() } });
          (streamer as any).vaultId = owned[0].toString();
        } else if (process.env.NODE_ENV !== 'production') {
          // Dev fallback: derive deterministic mock vault id to unblock local flows
          const h = ethers.keccak256(ethers.toUtf8Bytes(((streamer as any).walletAddress as string).toLowerCase()));
          const v = (BigInt(h) & ((1n << 56n) - 1n)).toString();
          await UserModel.updateOne({ _id: (streamer as any)._id }, { $set: { vaultId: v } });
          (streamer as any).vaultId = v;
        }
      } catch {}
    }
    if (!(streamer as any).vaultId) throw new Error('Streamer has no vault');
  }
  const vaultId = BigInt((streamer as any).vaultId);
  const channelId = generateChannelId(params.viewer, params.streamId, vaultId);
  const existing: any = await ChannelModel.findOne({ channelId }).lean();
  if (existing && !params.forceNew) {
    // If an existing channel is not OPEN (e.g., CLOSED/CLOSING), "re-open" it by resetting state.
    if (existing.status !== 'OPEN') {
      await ChannelModel.updateOne(
        { channelId },
        {
          $set: {
            status: 'OPEN',
            depositWei: params.depositWei.toString(),
            spentWei: '0',
            nonce: 0,
          },
          $unset: { lastSig: "" },
        }
      );
      return { channelId, reused: false, record: { ...existing, streamerVaultId: (streamer as any).vaultId } };
    }
    return { reused: true, channelId };
  }
  if (existing && params.forceNew) {
    // Create a synthetic new channelId by salting the streamId preimage (client provided salt preferred for deterministic viewer-side tx)
    const salt = params.forceSalt && /^0x[0-9a-fA-F]{8}$/.test(params.forceSalt)
      ? params.forceSalt
      : ethers.hexlify(ethers.randomBytes(4));
    const saltedId = generateChannelId(params.viewer, params.streamId + ':' + salt, vaultId);
    const docForced = await ChannelModel.create({
      channelId: saltedId,
      streamId: params.streamId,
      viewerAddress: params.viewer.toLowerCase(),
      streamerUserId: streamer?._id,
      streamerVaultId: (streamer as any).vaultId,
      depositWei: params.depositWei.toString(),
      spentWei: '0',
      nonce: 0,
      status: 'OPEN',
      forceSalt: salt,
    });
    return { channelId: saltedId, reused: false, record: docForced.toObject() };
  }
  const doc = await ChannelModel.create({
    channelId,
    streamId: params.streamId,
    viewerAddress: params.viewer.toLowerCase(),
  streamerUserId: streamer?._id,
    streamerVaultId: (streamer as any).vaultId,
    depositWei: params.depositWei.toString(),
    spentWei: '0',
    nonce: 0,
    status: 'OPEN',
  });
  return { channelId, reused: false, record: doc.toObject() };
}

export async function verifyAndApplyTip(payload: { channelId: string; newSpentWei: string; nonce: number; signature: string; viewer: string; message?: string }) {
  await connectMongo();
  const channel: any = await ChannelModel.findOne({ channelId: payload.channelId }).lean();
  if (!channel) throw new Error('Channel not found');
  if (channel.status !== 'OPEN') throw new Error('Channel not open');
  if (channel.viewerAddress.toLowerCase() !== payload.viewer.toLowerCase()) throw new Error('Viewer mismatch');
  const deposit = BigInt(channel.depositWei);
  const prevSpent = BigInt(channel.spentWei);
  const newSpent = BigInt(payload.newSpentWei);
  if (newSpent <= prevSpent) throw new Error('Non-incremental spent');
  const tip = newSpent - prevSpent;
  if (tip < BigInt(env.yellow.minTipWei)) throw new Error('Tip below minimum');
  if (newSpent > deposit) throw new Error('Exceeds deposit');
  if (payload.nonce !== channel.nonce + 1) throw new Error('Bad nonce');
  // Reconstruct signed state
  const vaultId = BigInt(channel.streamerVaultId);
  const state: ChannelStateStruct = {
    channelId: channel.channelId,
    vaultId,
    viewer: channel.viewerAddress,
    deposit,
    spent: newSpent,
    nonce: BigInt(payload.nonce),
  };
  // Cast channelTypes to mutable structure acceptable by ethers
  const mutableTypes: Record<string, Array<{ name: string; type: string }>> = {
    ChannelState: channelTypes.ChannelState.map(f => ({ ...f })),
  };
  const recovered = ethers.verifyTypedData(channelDomain(), mutableTypes, state as any, payload.signature);
  if (recovered.toLowerCase() !== channel.viewerAddress.toLowerCase()) throw new Error('Bad signature');
  await ChannelModel.updateOne({ channelId: channel.channelId }, { $set: { spentWei: newSpent.toString(), nonce: payload.nonce, lastSig: payload.signature } });
  return { tipWei: tip.toString(), newSpentWei: newSpent.toString(), nonce: payload.nonce };
}

export async function closeChannelCooperative(channelId: string) {
  await connectMongo();
  const channel: any = await ChannelModel.findOne({ channelId }).lean();
  if (!channel) throw new Error('Channel not found');
  if (channel.status !== 'OPEN') {
    // Idempotent: return current settled state without error
    const spent = BigInt(channel.spentWei || '0');
    const vaultId = BigInt(channel.streamerVaultId);
    return { ok: true, channelId, deposited: spent.toString(), vaultId: vaultId.toString(), depositTxHash: channel.closeTxHash || null, alreadyClosed: true };
  }
  // Set status to CLOSING during settlement
  await ChannelModel.updateOne({ channelId }, { $set: { status: 'CLOSING' } });
  const spent = BigInt(channel.spentWei || '0');
  const vaultId = BigInt(channel.streamerVaultId);
  let depositTx: string | null = null;
  if (spent > 0n) {
    try {
      depositTx = await blockchainService.depositToVault(vaultId, spent);
    } catch (e) {
      // In non-production, allow closing off-chain even if on-chain deposit fails
      if (process.env.NODE_ENV !== 'production') {
        depositTx = null;
      } else {
        await ChannelModel.updateOne({ channelId }, { $set: { status: 'OPEN' } });
        throw e;
      }
    }
  }
  await ChannelModel.updateOne({ channelId }, { $set: { status: 'CLOSED', closeTxHash: depositTx } });
  return { ok: true, channelId, deposited: spent.toString(), vaultId: vaultId.toString(), depositTxHash: depositTx, closeStatus: 'CLOSED' };
}

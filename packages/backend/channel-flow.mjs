// channel-flow.mjs
// End-to-end script: login (creator) -> ensure streamer + wallet/vault -> get streamId -> open channel -> tip -> close -> adjudicate

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const API_BASE = process.env.API_BASE || 'http://localhost:8000/api';

// Prefer global fetch (Node 18+). Fallback to node-fetch only if missing.
async function getFetch() {
  if (typeof fetch !== 'undefined') return fetch;
  const mod = await import('node-fetch');
  return mod.default;
}
const $fetch = await getFetch();

// Lazy import ethers (ESM)
const { ethers } = await import('ethers');

function logStep(title, data) {
  console.log(`\n=== ${title} ===`);
  if (data !== undefined) console.log(data);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function req(path, { method = 'GET', token, json, raw, headers: extraHeaders } = {}) {
  const headers = { 'content-type': 'application/json', ...(extraHeaders || {}) };
  if (token) headers['authorization'] = `Bearer ${token}`;
  const res = await $fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: json ? JSON.stringify(json) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    throw new Error(`${method} ${path} -> ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }
  if (raw) return text;
  try { return JSON.parse(text); } catch { return text; }
}

async function login(email, password) {
  return req('/auth/login', { method: 'POST', json: { email, password } });
}

async function signup(email, password, name) {
  return req('/auth/signup', { method: 'POST', json: { email, password, name } });
}

async function ensureStreamer(token) {
  try { await req('/users/role', { method: 'POST', token, json: { role: 'STREAMER' } }); } catch (_) {}
}

async function ensureVault(token, walletAddress) {
  try {
    const r = await req('/vaults', { method: 'POST', token, json: { walletAddress } });
    return { created: true, vaultId: r.vaultId };
  } catch (e) {
    if (String(e.message).includes('409')) return { created: false };
    throw e;
  }
}

async function getIngest(token) {
  return req('/stream/ingest', { method: 'POST', token });
}

async function channelsInit(token, streamId) {
  return req(`/channels/stream/${streamId}/init`, { method: 'GET', token });
}

async function openChannel(token, streamId, depositWei, viewer) {
  const headers = viewer ? { 'x-viewer-address': viewer } : undefined;
  return req('/channels/open', { method: 'POST', token, json: { streamId, depositWei: String(depositWei), viewer }, raw: false, headers });
}

async function getChannel(token, channelId) {
  return req(`/channels/${channelId}`, { method: 'GET', token });
}

async function tipChannel(token, channelId, payload, viewer) {
  const headers = viewer ? { 'x-viewer-address': viewer } : undefined;
  const body = viewer ? { ...payload, viewer } : payload;
  return req(`/channels/${channelId}/tip`, { method: 'POST', token, json: body, raw: false, headers });
}

async function closeChannel(token, channelId) {
  return req(`/channels/${channelId}/close`, { method: 'POST', token, json: {} });
}

async function adjudicateChannel(token, channelId, state, signature) {
  return req(`/channels/${channelId}/adjudicate`, { method: 'POST', token, json: { state, signature } });
}

// Dev-only: delete existing channel record so we can reopen with our viewer
async function deleteChannel(token, channelId) {
  return req(`/channels/${channelId}`, { method: 'DELETE', token });
}

// Optional credits deposit into per-stream balance (off-chain accounting)
async function creditsDeposit(token, streamId, amount) {
  return req('/monetization/deposit', { method: 'POST', token, json: { streamId, amount: Number(amount), token: 'NATIVE' } });
}

// EIP-712 helpers
function buildDomain(chainId, verifyingContract) {
  return { name: 'StreamFiChannel', version: '1', chainId, verifyingContract };
}
const channelTypes = {
  ChannelState: [
    { name: 'channelId', type: 'bytes32' },
    { name: 'vaultId', type: 'uint256' },
    { name: 'viewer', type: 'address' },
    { name: 'deposit', type: 'uint256' },
    { name: 'spent', type: 'uint256' },
    { name: 'nonce', type: 'uint64' },
  ],
};

async function main() {
  const email = process.env.E2E_EMAIL || 'creator+e2e@local';
  const password = process.env.E2E_PASSWORD || 'test123';

  // Use a deterministic viewer wallet across runs: env > cached file > new
  const cacheFile = process.env.E2E_VIEWER_PK_FILE || path.join(process.cwd(), '.e2e-viewer.key');
  const forcedAddr = (process.env.E2E_VIEWER_ADDRESS || '').trim().toLowerCase() || null;
  const forcedViewerPk = process.env.E2E_VIEWER_PK || null;
  let viewerPriv = process.env.E2E_VIEWER_PK || null;
  if (!viewerPriv) {
    try { if (fs.existsSync(cacheFile)) viewerPriv = fs.readFileSync(cacheFile, 'utf8').trim(); } catch {}
  }
  if (!viewerPriv && !forcedAddr) {
    viewerPriv = ethers.hexlify(ethers.randomBytes(32));
    try { fs.writeFileSync(cacheFile, viewerPriv, { mode: 0o600 }); } catch {}
  }
  // Construct wallet if we have a priv key
  let viewerWallet = (forcedViewerPk || viewerPriv) ? new ethers.Wallet((forcedViewerPk || viewerPriv)) : null;
  let viewerAddress = viewerWallet ? viewerWallet.address : null;
  if (forcedAddr) {
    if (viewerWallet) {
      if (viewerAddress.toLowerCase() !== forcedAddr) {
        // If PK provided but doesn't match address, fail loudly
        throw new Error(`E2E_VIEWER_ADDRESS (${forcedAddr}) does not match provided PK address (${viewerAddress}).`);
      }
    } else {
      // No PK: try cache, else require PK
      throw new Error(`Missing E2E_VIEWER_PK for address ${forcedAddr}. Provide the private key via E2E_VIEWER_PK env to sign tips.`);
    }
  }
  if (!viewerAddress) throw new Error('No viewer address could be determined');
  logStep('Viewer wallet', { address: viewerAddress });

  logStep('1) Login');
  let token, user;
  try {
    const res = await login(email, password);
    token = res.token; user = res.user;
  } catch (e) {
    if (String(e.message).includes('401') || String(e.message).includes('Invalid credentials')) {
      logStep('1a) Signup (user missing)');
      const res2 = await signup(email, password, 'Creator E2E');
      token = res2.token; user = res2.user;
    } else { throw e; }
  }
  logStep('Login OK', { user });

  logStep('2) Ensure STREAMER role');
  await ensureStreamer(token);

  // If E2E_STREAMER_ADDRESS is provided, set the creator's wallet to that; else default to viewerAddress for simplicity
  const streamerAddress = (process.env.E2E_STREAMER_ADDRESS || '').trim() || viewerAddress;
  logStep('3) Ensure vault & set walletAddress', { walletAddress: streamerAddress });
  const vault = await ensureVault(token, streamerAddress);
  logStep('Vault status', vault);

  logStep('4) Start or fetch ingest (streamId)');
  const ingest = await getIngest(token);
  const streamId = ingest.streamId;
  logStep('Stream info', ingest);

  // Optional: deposit off-chain credits for this stream (UI wallet credits demo)
  const credits = process.env.E2E_CREDITS_AMOUNT ? Number(process.env.E2E_CREDITS_AMOUNT) : 0;
  if (credits > 0) {
    logStep('4b) Deposit credits (off-chain accounting)', { streamId, credits });
    const cred = await creditsDeposit(token, streamId, credits);
    logStep('Credits balance', cred);
  }

  logStep('5) Fetch channel init for EIP-712');
  let init = await channelsInit(token, streamId);
  logStep('Init', init);

  const depositWei = String(process.env.E2E_DEPOSIT_WEI || '300000000000000'); // default 0.0003 ETH to allow two tips
  logStep('6) Open channel', { streamId, depositWei });
  let opened;
  try {
    opened = await openChannel(token, streamId, depositWei, viewerAddress);
  } catch (e) {
    const msg = String(e.message || '');
    if (/Streamer has no vault/i.test(msg)) {
      logStep('Streamer has no vault; retrying after short delay');
      await sleep(800);
      init = await channelsInit(token, streamId);
      logStep('Re-init', init);
      opened = await openChannel(token, streamId, depositWei, viewerAddress);
    } else {
      throw e;
    }
  }
  logStep('Open result', opened);
  let channelId = opened.channelId;

  // If server reused a channel with a different viewer, wipe it in dev and reopen cleanly
  if (opened.reused) {
    const ch0 = await getChannel(token, channelId);
    if (String(ch0.viewerAddress).toLowerCase() !== String(viewerAddress).toLowerCase()) {
      logStep('Reused channel owned by different viewer; deleting for clean run', { existingViewer: ch0.viewerAddress });
      try { await deleteChannel(token, channelId); } catch (e) { logStep('Delete channel failed (ignorable)', String(e.message || e)); }
  const reopened = await openChannel(token, streamId, depositWei, viewerAddress);
      logStep('Reopen result', reopened);
      channelId = reopened.channelId;
    }
  }

  if (!channelId) throw new Error('No channelId returned from open');

  // Retrieve channel record for vaultId, deposit, nonce
  let ch = await getChannel(token, channelId);
  logStep('Channel record', ch);
  const vaultId = BigInt(ch.streamerVaultId);
  let deposit = BigInt(ch.depositWei);
  let nonce = Number(ch.nonce);
  let spent = BigInt(ch.spentWei || '0');

  // Prepare first tip
  let tip1 = BigInt(process.env.E2E_TIP1_WEI || '50000000000000'); // 0.00005
  let tip2 = BigInt(process.env.E2E_TIP2_WEI || '25000000000000'); // 0.000025
  // If reused and deposit is insufficient for two tips, try to delete and reopen
  const plannedFinal = spent + tip1 + tip2;
  if (opened.reused && deposit < plannedFinal) {
    logStep('Reused with low deposit; deleting and reopening', { deposit: deposit.toString(), plannedFinal: plannedFinal.toString() });
    try { await deleteChannel(token, channelId); } catch {}
    opened = await openChannel(token, streamId, depositWei, viewerAddress);
    logStep('Reopen result', opened);
    channelId = opened.channelId;
    ch = await getChannel(token, channelId);
    logStep('Channel record (after reopen)', ch);
    deposit = BigInt(ch.depositWei);
    spent = BigInt(ch.spentWei || '0');
    nonce = Number(ch.nonce);
  }
  // If still insufficient, clamp tips to fit deposit while respecting minTip
  const minTip = BigInt(init.minTipWei);
  if (spent + tip1 + tip2 > deposit) {
    const budget = deposit - spent;
    if (budget < minTip) {
      // No room for any tip; skip tipping
      tip1 = 0n; tip2 = 0n;
    } else {
      if (tip1 > budget) tip1 = budget;
      const remaining = budget - tip1;
      if (remaining < minTip) tip2 = 0n; else if (tip2 > remaining) tip2 = remaining;
    }
  }
  const newSpent1 = spent + tip1;

  // Build typed data and sign
  const domain = buildDomain(init.chainId, init.channelContract);
  logStep('EIP-712 domain', domain);
  const state1 = {
    channelId,
    vaultId,
    viewer: viewerAddress,
    deposit,
    spent: newSpent1,
    nonce: BigInt(nonce + 1),
  };
  const sig1 = await viewerWallet.signTypedData(domain, channelTypes, state1);

  // Local verification sanity check
  try {
    const recovered = ethers.verifyTypedData(domain, channelTypes, state1, sig1);
    logStep('Local recover #1', { recovered, matches: recovered.toLowerCase() === viewerAddress.toLowerCase() });
  } catch (e) {
    logStep('Local verify error #1', String(e?.message || e));
  }

  logStep('7) Tip channel #1', { newSpentWei: newSpent1.toString(), nonce: Number(state1.nonce) });
  const tipResp1 = await tipChannel(token, channelId, {
    newSpentWei: newSpent1.toString(),
    nonce: Number(state1.nonce),
    signature: sig1,
    message: 'First superchat!'
  }, viewerAddress);
  logStep('Tip result #1', tipResp1);

  // Optional second tip (may have been clamped above)
  const newSpent2 = newSpent1 + tip2;
  const state2 = {
    channelId,
    vaultId,
    viewer: viewerAddress,
    deposit,
    spent: newSpent2,
    nonce: BigInt(Number(state1.nonce) + 1),
  };
  const sig2 = await viewerWallet.signTypedData(domain, channelTypes, state2);
  try {
    const recovered2 = ethers.verifyTypedData(domain, channelTypes, state2, sig2);
    logStep('Local recover #2', { recovered: recovered2, matches: recovered2.toLowerCase() === viewerAddress.toLowerCase() });
  } catch (e) {
    logStep('Local verify error #2', String(e?.message || e));
  }
  logStep('8) Tip channel #2', { newSpentWei: newSpent2.toString(), nonce: Number(state2.nonce) });
  const tipResp2 = await tipChannel(token, channelId, {
    newSpentWei: newSpent2.toString(),
    nonce: Number(state2.nonce),
    signature: sig2,
    message: 'Second superchat!'
  }, viewerAddress);
  logStep('Tip result #2', tipResp2);

  // Close cooperatively
  logStep('9) Close channel');
  const closed = await closeChannel(token, channelId);
  logStep('Close result', closed);
  if (closed?.alreadyClosed || closed?.skippedOnchain) {
    logStep('Close note', { alreadyClosed: !!closed.alreadyClosed, skippedOnchain: !!closed.skippedOnchain });
  }

  // Adjudicate with last state (serialize bigints)
  logStep('10) Adjudicate');
  const stateJson = {
    channelId: state2.channelId,
    vaultId: state2.vaultId.toString(),
    viewer: state2.viewer,
    deposit: state2.deposit.toString(),
    spent: state2.spent.toString(),
    nonce: state2.nonce.toString(),
  };
  const adj = await adjudicateChannel(token, channelId, stateJson, sig2);
  logStep('Adjudicate result', adj);

  console.log('\n✅ Flow completed.');
}

main().catch((err) => {
  console.error('\n❌ Flow failed:', err.message);
  process.exit(1);
});

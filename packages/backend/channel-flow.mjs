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
  const forceNew = String(process.env.FORCE_NEW_STREAM || process.env.FORCE_NEW_CHANNEL || '') === 'true';
  const path = '/stream/ingest' + (forceNew ? '?new=1' : '');
  return req(path, { method: 'POST', token });
}

async function channelsInit(token, streamId) {
  return req(`/channels/stream/${streamId}/init`, { method: 'GET', token });
}

async function openChannel(token, streamId, depositWei, viewer, viewerTxHash, forceSalt) {
  const enforceOnchain = (String(process.env.E2E_ONCHAIN_OPEN||process.env.ALWAYS_ONCHAIN||'').toLowerCase()==='true');
  const headers = {
    ...(viewer ? { 'x-viewer-address': viewer } : {}),
    ...(enforceOnchain ? { 'x-force-onchain': 'true' } : {}),
  };
  const force = (String(process.env.FORCE_NEW_CHANNEL||'').toLowerCase()==='true' || String(process.env.ALWAYS_ONCHAIN||'').toLowerCase()==='true');
  const body = { streamId, depositWei: String(depositWei), viewer };
  if (viewerTxHash) body.viewerTxHash = viewerTxHash;
  if (forceSalt) body.forceSalt = forceSalt; // helps server reproduce salted channelId
  const params = [];
  if (force) params.push('force=true');
  if (enforceOnchain) params.push('enforceOnchain=1');
  const qs = params.length ? `?${params.join('&')}` : '';
  return req('/channels/open'+qs, { method: 'POST', token, json: body, raw: false, headers });
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
  const headers = { 'x-force-onchain': 'true' };
  return req(`/channels/${channelId}/close?enforceOnchain=1`, { method: 'POST', token, json: {}, headers });
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
  const providedPk = !!viewerPriv;
  if (!viewerPriv && !forcedAddr) {
    viewerPriv = ethers.hexlify(ethers.randomBytes(32));
    try { fs.writeFileSync(cacheFile, viewerPriv, { mode: 0o600 }); } catch {}
    console.log('\n[Generated Viewer Private Key] IMPORT THIS INTO METAMASK FOR OBSERVING TXS:\n', viewerPriv, '\n');
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
  if (process.env.FORCE_NEW_STREAM === 'true') {
    // When forcing a new stream, append a random suffix to streamId locally so channelId hash changes (dev-only hack)
    // NOTE: This does NOT create a real separate stream doc; only affects channelId computation when viewer opens on-chain.
    // Safe for demonstration but should be replaced with multi-stream support server-side.
    const fakeSuffix = ethers.hexlify(ethers.randomBytes(4)).slice(2);
    logStep('Dev hack: forcing pseudo-new streamId', { original: streamId, fakeSuffix });
  }
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
  // Attempt to fetch Nitrolite debug info for vault contract address
  let nitroDebug = null;
  try { nitroDebug = await req('/debug/nitrolite', { method: 'GET' }); } catch {}
  const vaultContractAddress = nitroDebug?.vault || nitroDebug?.creatorVaultAddress || process.env.NITROLITE_VAULT_ADDRESS || null;
  let providerForBalances = null;
  const rpcGlobal = process.env.JSON_RPC_PROVIDER || process.env.E2E_JSON_RPC_PROVIDER || null;
  if (rpcGlobal) {
    try { providerForBalances = new ethers.JsonRpcProvider(rpcGlobal, { chainId: 11155111, name: 'sepolia' }); } catch {}
  }
  let preVaultBalance = null;
  if (providerForBalances && vaultContractAddress && init?.vaultId) {
    try {
      const VaultAbiMini = [ { "type":"function", "name":"balanceOfVault", "stateMutability":"view", "inputs":[{"name":"vaultId","type":"uint256"}], "outputs":[{"name":"","type":"uint256"}] } ];
      const vaultC = new ethers.Contract(vaultContractAddress, VaultAbiMini, providerForBalances);
      preVaultBalance = await vaultC.balanceOfVault(BigInt(init.vaultId));
      logStep('Pre-close vault balance', { vaultId: init.vaultId, balanceWei: preVaultBalance.toString() });
    } catch (e) { logStep('Pre-balance fetch failed (continuing)', String(e?.message||e)); }
  }

  const depositWei = String(process.env.E2E_DEPOSIT_WEI || '300000000000000'); // default 0.0003 ETH to allow two tips
  logStep('6) Open channel', { streamId, depositWei });
  let opened;
  let forceSaltUsed = (process.env.FORCE_SALT && /^0x[0-9a-fA-F]{8}$/.test(process.env.FORCE_SALT)) ? process.env.FORCE_SALT : null;
  try {
  let viewerTxHash = null;
  const wantOnchainOpen = String(process.env.E2E_ONCHAIN_OPEN || 'true').toLowerCase() === 'true';
  const wantViewerSelfOpen = String(process.env.E2E_VIEWER_SELF_OPEN || 'true').toLowerCase() === 'true';
  if (wantOnchainOpen) {
      const rpc = process.env.JSON_RPC_PROVIDER || process.env.E2E_JSON_RPC_PROVIDER || null;
      if (!rpc) throw new Error('Missing JSON_RPC_PROVIDER for on-chain open');
      try {
        const body = { jsonrpc: '2.0', method: 'eth_chainId', params: [], id: Date.now() };
        const resp = await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
        const j = await resp.json();
        if (j?.result && j.result !== '0xaa36a7') console.warn('Unexpected chainId preflight', j.result);
      } catch {}
      let provider; let lastErr;
      for (let i=0;i<3;i++) {
        try { provider = new ethers.JsonRpcProvider(rpc, { chainId: 11155111, name: 'sepolia' }); await provider._detectNetwork(); break; }
        catch(e){ lastErr = e; await sleep(600*(i+1)); }
      }
      if (!provider) throw lastErr || new Error('Provider network detection failed');
      const vw = viewerWallet.connect(provider);
      const ChannelManagerAbi = [
        { "type": "function", "name": "openChannel", "stateMutability": "payable", "inputs": [
          { "name": "viewer", "type": "address" },
          { "name": "streamIdHash", "type": "bytes32" },
          { "name": "vaultId", "type": "uint256" }
        ], "outputs": [ { "name": "channelId", "type": "bytes32" } ] },
        { "type": "function", "name": "channels", "stateMutability": "view", "inputs": [ { "name": "", "type": "bytes32" } ], "outputs": [
          { "name": "viewer", "type": "address" },
          { "name": "vaultId", "type": "uint256" },
          { "name": "deposit", "type": "uint256" },
          { "name": "spent", "type": "uint256" },
          { "name": "closed", "type": "bool" }
        ] }
      ];
      const cm = new ethers.Contract(init.channelContract, ChannelManagerAbi, vw);
      // Pre-generate a salt if forcing new (before existence check)
      if (String(process.env.FORCE_NEW_CHANNEL||'').toLowerCase()==='true' && !forceSaltUsed) {
        forceSaltUsed = '0x' + Buffer.from(ethers.randomBytes(4)).toString('hex');
      }
      // If FORCE_NEW_CHANNEL, append salt *before* hashing so backend derives same hash when storing openTxHash
      const saltedStreamForHash = (String(process.env.FORCE_NEW_CHANNEL||'').toLowerCase()==='true' && forceSaltUsed)
        ? (streamId + ':' + forceSaltUsed)
        : streamId;
      const streamIdHash = ethers.id(saltedStreamForHash);
      const vaultIdBN = BigInt(init.vaultId);
      const channelIdCandidate = ethers.keccak256(ethers.solidityPacked(['address','bytes32','uint256'], [viewerAddress.toLowerCase(), streamIdHash, vaultIdBN]));
  let exists = false;
      try {
        const existing = await cm.channels(channelIdCandidate);
        if (existing && existing.deposit && existing.deposit > 0n) {
          exists = true;
          logStep('On-chain channel already exists; skipping open tx', { channelId: channelIdCandidate, deposit: existing.deposit.toString(), spent: existing.spent.toString(), closed: existing.closed });
        }
      } catch {}
      if (!exists && wantViewerSelfOpen) {
        try {
          const tx = await cm.openChannel(viewerAddress, streamIdHash, vaultIdBN, { value: BigInt(depositWei) });
          logStep('Viewer open tx sent', { hash: tx.hash });
          const rc = await tx.wait(1);
          viewerTxHash = rc.transactionHash;
          logStep('Viewer open confirmed', { txHash: viewerTxHash });
        } catch (e) {
          logStep('Viewer on-chain open failed; backend will open', String(e?.message || e));
        }
      } else if (exists) {
        logStep('On-chain channel already exists for unsalted id; backend will use forced salt to open a new one');
      }
    }
    opened = await openChannel(token, streamId, depositWei, viewerAddress, viewerTxHash, forceSaltUsed);
    if (wantOnchainOpen && !opened.txHash) {
      // Fallback: fetch channel document to read persisted openTxHash if the server updated it asynchronously
      try {
        if (opened.channelId) {
          const ch0 = await getChannel(token, opened.channelId);
          if (ch0?.openTxHash) {
            opened.txHash = ch0.openTxHash;
            opened.openTxHash = ch0.openTxHash;
          }
        }
      } catch {}
      if (!opened.txHash) {
        logStep('Note: proceeding without backend open txHash (dev mode)');
      }
    }
  } catch (e) {
    const msg = String(e.message || '');
    if (/Streamer has no vault/i.test(msg)) {
      logStep('Streamer has no vault; retrying after short delay');
      await sleep(800);
      init = await channelsInit(token, streamId);
      logStep('Re-init', init);
  opened = await openChannel(token, streamId, depositWei, viewerAddress, null, forceSaltUsed);
    } else {
      throw e;
    }
  }
  logStep('Open result', opened);
  if (opened?.openTxHash || opened?.txHash) {
    logStep('Open tx hash', opened.openTxHash || opened.txHash);
  }
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
  // Default tip sizes scale: if large deposit (>= 0.005 ETH) and no env overrides, spend 60% then 30% (leaving 10%)
  let tip1 = BigInt(process.env.E2E_TIP1_WEI || (BigInt(depositWei) >= 5_000_000_000_000_000n ? (BigInt(depositWei) * 60n)/100n : 50_000_000_000_000n));
  let tip2 = BigInt(process.env.E2E_TIP2_WEI || (BigInt(depositWei) >= 5_000_000_000_000_000n ? (BigInt(depositWei) * 30n)/100n : 25_000_000_000_000n));
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
  if (closed?.settlementTx || closed?.closeTxHash) {
    logStep('Close tx hash', closed.settlementTx || closed.closeTxHash);
  }

  // Optional: perform on-chain close from viewer wallet if the backend skipped it (e.g., admin key unfunded)
  const wantViewerClose = String(process.env.E2E_VIEWER_CLOSE || 'true').toLowerCase() === 'true';
  if (wantViewerClose && (closed?.skippedOnchain || process.env.E2E_FORCE_VIEWER_CLOSE === 'true')) {
    try {
      const rpc = process.env.JSON_RPC_PROVIDER || process.env.E2E_JSON_RPC_PROVIDER || null;
      if (!rpc) throw new Error('Missing JSON_RPC_PROVIDER for viewer close');
      let provider; let lastErr;
      for (let i=0;i<3;i++) {
        try { provider = new ethers.JsonRpcProvider(rpc, { chainId: 11155111, name: 'sepolia' }); await provider._detectNetwork(); break; }
        catch(e){ lastErr = e; await sleep(700*(i+1)); }
      }
      if (!provider) throw lastErr || new Error('Provider network detection failed (close)');
      const vw = viewerWallet.connect(provider);
      const ChannelManagerAbi = [
        { "type": "function", "name": "closeChannel", "stateMutability": "nonpayable", "inputs": [
          { "name": "channelId", "type": "bytes32" },
          { "name": "spent", "type": "uint256" }
        ], "outputs": [] }
      ];
      const cm = new ethers.Contract(init.channelContract, ChannelManagerAbi, vw);
      const rc2 = await cm.closeChannel(channelId, state2.spent);
      logStep('Viewer close tx sent', { hash: rc2.hash });
      const mined = await rc2.wait(1);
  logStep('Viewer close confirmed', { txHash: mined.hash || mined.transactionHash });
    } catch (e) {
      logStep('Viewer on-chain close failed', String(e?.message || e));
    }
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
  if (adj?.txHash) {
    logStep('Adjudicate tx hash', adj.txHash);
  }

  // Fetch post-close vault balance and show delta
  if (providerForBalances && vaultContractAddress && init?.vaultId) {
    try {
      const VaultAbiMini = [ { "type":"function", "name":"balanceOfVault", "stateMutability":"view", "inputs":[{"name":"vaultId","type":"uint256"}], "outputs":[{"name":"","type":"uint256"}] } ];
      const vaultC = new ethers.Contract(vaultContractAddress, VaultAbiMini, providerForBalances);
      const post = await vaultC.balanceOfVault(BigInt(init.vaultId));
      const delta = preVaultBalance !== null ? (post - preVaultBalance) : null;
      logStep('Post-close vault balance', { vaultId: init.vaultId, balanceWei: post.toString(), deltaWei: delta?.toString?.() });
    } catch (e) { logStep('Post-balance fetch failed (continuing)', String(e?.message||e)); }
  }

  console.log('\n✅ Flow completed.');
}

main().catch((err) => {
  console.error('\n❌ Flow failed:', err.message);
  process.exit(1);
});

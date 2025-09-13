// Deprecated: Yellow faucet is no longer used. Keep file to avoid broken imports/scripts.
async function main() {
  const address = process.argv[2] || '<address>';
  console.log(`[yellow-faucet] Disabled. No faucet available. Input: ${address}`);
}

main().catch((e)=>{ console.error(e); process.exit(1); });

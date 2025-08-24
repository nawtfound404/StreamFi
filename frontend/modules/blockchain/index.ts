// Blockchain & NFT (stubs)
export type MintRequest = { to: string; type: "badge" | "collectible"; metadata: Record<string, unknown> };

export const blockchain = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async mintNFT(_req: MintRequest) {
    // TODO: integrate Web3 provider
    return { txHash: "0xabc" };
  },
};

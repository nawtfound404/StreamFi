"use client";

import React from "react";
import { useAuthStore } from "../stores/auth-store";
import { Button } from "./ui/button";

// A small helper function to make addresses look nice (e.g., 0x123...4567)
const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function ConnectWalletButton() {
  // Get the state and actions from our Zustand store
  const walletAddress = useAuthStore((state) => state.walletAddress);
  const connectWallet = useAuthStore((state) => state.connectWallet);
  const disconnectWallet = useAuthStore((state) => state.connectWallet);

  if (walletAddress) {
    // If a wallet is connected, show the address and a disconnect button
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          {truncateAddress(walletAddress)}
        </span>
        <Button variant="outline" size="sm" onClick={disconnectWallet}>
          Disconnect
        </Button>
      </div>
    );
  }

  // If no wallet is connected, show the "Connect Wallet" button
  return <Button onClick={connectWallet}>Connect Wallet</Button>;
}

"use client";

import React from "react";
import { http, WagmiProvider } from "wagmi";
import { mainnet, sepolia, polygon } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";

// Configure wagmi + RainbowKit
const wagmiConfig = getDefaultConfig({
	appName: "StreamFi",
	projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "streamfi-demo",
	chains: [mainnet, polygon, sepolia],
	transports: {
		[mainnet.id]: http(),
		[polygon.id]: http(),
		[sepolia.id]: http(),
	},
	ssr: true,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
	return (
		<WagmiProvider config={wagmiConfig}>
			<QueryClientProvider client={queryClient}>
			<RainbowKitProvider modalSize="compact">
					{children}
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
}


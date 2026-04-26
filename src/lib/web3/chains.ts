import { base, baseSepolia, mainnet, polygon, polygonAmoy, sepolia } from "viem/chains";
import type { Chain } from "viem/chains";

export type SupportedChainKey =
  | "base"
  | "base-sepolia"
  | "polygon"
  | "polygon-amoy"
  | "ethereum"
  | "sepolia";

const CHAIN_BY_KEY: Record<SupportedChainKey, Chain> = {
  base,
  "base-sepolia": baseSepolia,
  polygon,
  "polygon-amoy": polygonAmoy,
  ethereum: mainnet,
  sepolia,
};

export const CHAIN_LABELS: Record<SupportedChainKey, string> = {
  base: "Base",
  "base-sepolia": "Base Sepolia",
  polygon: "Polygon",
  "polygon-amoy": "Polygon Amoy",
  ethereum: "Ethereum",
  sepolia: "Sepolia",
};

export const EXPLORERS: Record<number, string> = {
  1: "https://etherscan.io",
  11155111: "https://sepolia.etherscan.io",
  137: "https://polygonscan.com",
  80002: "https://amoy.polygonscan.com",
  8453: "https://basescan.org",
  84532: "https://sepolia.basescan.org",
};

export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  11155111: "Sepolia",
  137: "Polygon",
  80002: "Polygon Amoy",
  8453: "Base",
  84532: "Base Sepolia",
};

export function chainLabel(chainId: number): string {
  return CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;
}

export function getDefaultChain(): Chain {
  const key = (process.env.NEXT_PUBLIC_WEB3_CHAIN as SupportedChainKey) || "base-sepolia";
  return CHAIN_BY_KEY[key] ?? baseSepolia;
}

export function isWeb3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_WEB3 === "true";
}

export function explorerForChain(chainId: number): string | null {
  return EXPLORERS[chainId] ?? null;
}

export function txUrl(chainId: number, txHash: string): string | null {
  const base = explorerForChain(chainId);
  return base ? `${base}/tx/${txHash}` : null;
}

export function tokenUrl(
  chainId: number,
  contract: string,
  tokenId: string,
): string | null {
  const base = explorerForChain(chainId);
  return base ? `${base}/token/${contract}?a=${tokenId}` : null;
}

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

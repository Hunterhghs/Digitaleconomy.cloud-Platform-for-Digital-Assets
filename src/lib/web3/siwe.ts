import { siteConfig } from "@/lib/site";

export interface SiweMessageInput {
  address: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  statement?: string;
  domain?: string;
  uri?: string;
}

/**
 * Build a deterministic Sign-In With Ethereum (EIP-4361) message string. We
 * generate this on the server, hand it to the client to sign with the user's
 * wallet, and verify the signature back on the server. The format intentionally
 * mirrors the spec so it remains compatible if/when we swap in the official
 * `siwe` package.
 */
export function buildSiweMessage(input: SiweMessageInput): string {
  const domain = input.domain ?? new URL(siteConfig.url).host;
  const uri = input.uri ?? siteConfig.url;
  const statement =
    input.statement ??
    "Sign in to DigitalEconomy.cloud to link this wallet to your account. This signature does not authorize any transaction.";

  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    input.address,
    "",
    statement,
    "",
    `URI: ${uri}`,
    `Version: 1`,
    `Chain ID: ${input.chainId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expirationTime}`,
  ].join("\n");
}

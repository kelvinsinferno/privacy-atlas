import { SiweMessage } from "siwe";

/** Minimal EIP-1193 surface — just enough to request accounts and personal_sign. */
interface Eip1193 {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

function provider(): Eip1193 | null {
  const w = window as unknown as { ethereum?: Eip1193 };
  return w.ethereum ?? null;
}

/** Connect a wallet + complete SIWE → sets the pa_session cookie. Returns the address or throws. */
export async function connectAndSignIn(): Promise<string> {
  const eth = provider();
  if (!eth) throw new Error("No wallet found. Install a browser wallet to contribute.");
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts[0];
  if (!address) throw new Error("No account");
  const nonceRes = await fetch("/api/contribute/nonce", { method: "POST" });
  if (!nonceRes.ok) throw new Error("Sign-in failed");
  const { nonce } = await nonceRes.json();
  const message = new SiweMessage({
    domain: location.host,
    address,
    statement: "Sign in to contribute to Privacy Atlas.",
    uri: location.origin,
    version: "1",
    chainId: 1,
    nonce,
  }).prepareMessage();
  const signature = (await eth.request({ method: "personal_sign", params: [message, address] })) as string;
  const res = await fetch("/api/contribute/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, signature, nonce }),
  });
  if (!res.ok) throw new Error("Sign-in failed");
  return (await res.json()).address as string;
}

/** Truncate a wallet address for display: 0x1234…abcd */
export function shortAddress(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

import { SiweMessage, generateNonce } from "siwe";

export function makeNonce(): string {
  return generateNonce();
}

/** Verify an EIP-4361 message + signature against an expected nonce.
 *  Returns the lowercased address on success, else null. */
export async function verifySiwe(
  message: string,
  signature: string,
  expectedNonce: string,
): Promise<string | null> {
  try {
    const siwe = new SiweMessage(message);
    // siwe@3: verify() returns Promise<SiweResponse> = { success, error?, data }.
    // It throws on failure unless suppressExceptions is set; the catch below
    // covers that path so the function fails closed either way.
    const res = await siwe.verify({ signature, nonce: expectedNonce });
    if (!res.success) return null;
    // Read the address from the verified message (res.data), EIP-55 checksummed.
    return res.data.address.toLowerCase();
  } catch {
    return null;
  }
}

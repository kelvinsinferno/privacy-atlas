import { SignJWT, jwtVerify } from "jose";

const DEV_SECRET = "dev-only-insecure-secret-change-me";

/** Derive the signing key. Fails fast (at request time, not import — so `next build`
 *  doesn't break) if production is left on the insecure dev default, which would make
 *  every session forgeable. */
const KEY = () => {
  const secret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret === DEV_SECRET)) {
    throw new Error("SESSION_SECRET must be set to a strong, non-default value in production");
  }
  return new TextEncoder().encode(secret || DEV_SECRET);
};

/** Issue a short-lived session token binding to a wallet address. */
export async function issueSession(address: string): Promise<string> {
  return new SignJWT({ addr: address.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(KEY());
}

/** Read + verify a session token → the address, or null. */
export async function readSession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, KEY(), { algorithms: ["HS256"] });
    return typeof payload.addr === "string" ? payload.addr : null;
  } catch {
    return null;
  }
}

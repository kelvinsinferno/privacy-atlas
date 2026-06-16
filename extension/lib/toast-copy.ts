import type { ToastPayload } from "./types";

export function toastHeadline(p: ToastPayload): string {
  return p.mode === "adopt"
    ? `Detected: ${p.threatLabel}`
    : `${p.threatLabel} — you're equipped`;
}

export function toastBody(p: ToastPayload): string {
  const first = p.moves[0]?.label ?? "";
  return p.mode === "adopt"
    ? `Atlas move that defends this: ${first}.`
    : `You set up "${first}" — this is a good place to use it.`;
}

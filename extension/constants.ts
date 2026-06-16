import type { LeakClass } from "./lib/types";
export const ATLAS_URL = "https://privacyatlas.xyz"; // deep-link target; dev override via env at build
export const LEAK_CLASSES = [
  "advertising", "analytics", "fingerprinting", "session-replay", "social",
] as const satisfies readonly LeakClass[];

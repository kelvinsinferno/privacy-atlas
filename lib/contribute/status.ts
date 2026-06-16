import { entryStatus } from "@/lib/community";

/** Compute review status from an entry id + its vote tallies (reuses the hidden-bar engine). */
export function statusFor(id: string, confirms: number, flags: number): "verified" | "rejected" | "pending" {
  return entryStatus({ id, confirms, flags });
}

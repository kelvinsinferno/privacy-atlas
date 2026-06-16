/**
 * app/llms.txt/route.ts
 *
 * Serves /llms.txt — a machine-readable index of the Privacy Atlas knowledge base.
 * Next.js App Router interprets a folder named "llms.txt" as the literal path segment
 * "/llms.txt", so GET /llms.txt resolves here.
 *
 * SECURITY: uses buildLlmsTxt() — pure function, zero user data.
 */

import { buildLlmsTxt } from "@/lib/knowledge";

export const dynamic = "force-static"; // static — pure open knowledge

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

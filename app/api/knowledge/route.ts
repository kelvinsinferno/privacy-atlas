/**
 * app/api/knowledge/route.ts
 *
 * Serves GET /api/knowledge — the full open Privacy Atlas knowledge base as JSON.
 * Permissive CORS is intentional: this is open, public, machine-readable data
 * with zero user data. Cross-origin consumers (LLMs, apps, researchers) are welcome.
 *
 * SECURITY: uses buildKnowledgeJSON() — pure function, zero user data.
 */

import { buildKnowledgeJSON } from "@/lib/knowledge";

export const dynamic = "force-static"; // static — pure open knowledge

export function GET() {
  return Response.json(buildKnowledgeJSON(), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

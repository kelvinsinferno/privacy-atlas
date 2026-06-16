import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { actions } from "./maintainer-actions.js";

const reply = (r: { data: unknown }) => ({
  content: [{ type: "text" as const, text: JSON.stringify(r.data, null, 2) }],
  structuredContent: (r.data ?? {}) as Record<string, unknown>,
});

const verdictInput = {
  contributionId: z.string().min(1).describe("the contribution id to act on"),
  reason: z.string().max(600).optional().describe("short reason (audited)"),
};
const ACTION = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false } as const;

/** Register the maintainer WRITE tools on a (key-gated) MCP server. */
export function registerMaintainerTools(server: McpServer): void {
  server.registerTool("list_pending", {
    title: "List contributions pending maintainer review",
    description: "Return the queue of community contributions needing review (unbadged or downvote-flagged), each with full payload + vote tallies. Read-only.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async () => reply(await actions.list_pending()));

  server.registerTool("grant_badge", {
    title: "Grant the verified badge",
    description: "Grant the revocable '✓ verified' badge to a contribution (it has been confirmed to work / be accurate). Audited as 'hermes'.",
    inputSchema: verdictInput,
    annotations: ACTION,
  }, async (a) => reply(await actions.grant_badge(a)));

  server.registerTool("revoke_badge", {
    title: "Revoke the verified badge",
    description: "Pull a previously-granted verified badge back to none (the entry stays live). Destructive — removes trust. Audited as 'hermes'.",
    inputSchema: verdictInput,
    annotations: DESTRUCTIVE,
  }, async (a) => reply(await actions.revoke_badge(a)));

  server.registerTool("reject", {
    title: "Reject (remove) a contribution",
    description: "Remove a contribution that has been confirmed not to work / to be bad. Destructive. Audited as 'hermes'.",
    inputSchema: verdictInput,
    annotations: DESTRUCTIVE,
  }, async (a) => reply(await actions.reject(a)));

  server.registerTool("set_review_meta", {
    title: "Set commercial / affiliate review metadata",
    description: "Record that a resource is commercial and/or attach an affiliate relationship you set up (hasProgram/url/notes). The site uses the affiliate url as the disclosed link. Audited as 'hermes'.",
    inputSchema: {
      contributionId: z.string().min(1).describe("the contribution id"),
      commercial: z.boolean().optional().describe("is this a commercial product/service"),
      affiliate: z.object({
        hasProgram: z.boolean().optional(),
        url: z.string().url().optional().describe("the affiliate link (https)"),
        notes: z.string().max(600).optional(),
      }).optional().describe("the affiliate relationship you established"),
    },
    annotations: ACTION,
  }, async (a) => reply(await actions.set_review_meta(a)));
}

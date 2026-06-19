#!/usr/bin/env bash
set -euo pipefail

: "${HERMES_HOME:=/data/hermes}"
: "${PORT:=10000}"
: "${WEBHOOK_PORT:=$PORT}"
: "${WEBHOOK_HOST:=0.0.0.0}"
: "${HERMES_MODEL_PROVIDER:=openrouter}"
: "${HERMES_MODEL:=anthropic/claude-sonnet-4}"
: "${HERMES_WEBHOOK_SECRET:?HERMES_WEBHOOK_SECRET is required}"
: "${MAINTAINER_API_KEY:?MAINTAINER_API_KEY is required}"

export HERMES_HOME WEBHOOK_ENABLED=true WEBHOOK_PORT WEBHOOK_SECRET="$HERMES_WEBHOOK_SECRET"
mkdir -p "$HERMES_HOME"
chmod 700 "$HERMES_HOME" || true

cat > "$HERMES_HOME/config.yaml" <<YAML
model:
  provider: "${HERMES_MODEL_PROVIDER}"
  default: "${HERMES_MODEL}"
agent:
  max_turns: 60
  gateway_timeout: 1800
  tool_use_enforcement: auto
terminal:
  backend: local
  cwd: /tmp
  timeout: 180
memory:
  memory_enabled: false
  user_profile_enabled: false
approvals:
  mode: smart
security:
  redact_secrets: true
platforms:
  webhook:
    enabled: true
    extra:
      host: "${WEBHOOK_HOST}"
      port: ${WEBHOOK_PORT}
      secret: "${HERMES_WEBHOOK_SECRET}"
      routes:
        privacy-atlas:
          events:
            - contribution.new
            - contribution.flagged
          secret: "${HERMES_WEBHOOK_SECRET}"
          deliver: log
          rate_limit: 30
          prompt: |
            Privacy Atlas maintainer webhook fired.
            Event: {type}
            Contribution ID: {contributionId}
            Full payload:
            {__raw__}

            Act as the Privacy Atlas maintainer. Pull current graph context and the pending contribution queue. Inspect this contribution carefully. Verify URLs before trusting them. Check accuracy, usefulness, safety, commercial/affiliate status, and whether a free alternative should be preferred. Use the maintainer MCP tools to grant a verified badge only when confident; set review metadata for commercial/affiliate resources when appropriate; revoke if a previously verified item no longer deserves it; reject only if clearly wrong, broken, spammy, malicious, or harmful; otherwise skip and leave it unverified. Keep audit reasons concise and specific.
mcp_servers:
  privacy_atlas:
    url: "https://privacy-atlas.onrender.com/mcp"
    timeout: 180
    connect_timeout: 60
  privacy_atlas_maintainer:
    url: "https://privacy-atlas.onrender.com/mcp-maintainer"
    headers:
      Authorization: "Bearer ${MAINTAINER_API_KEY}"
    timeout: 180
    connect_timeout: 60
YAML

cat > "$HERMES_HOME/.env" <<ENV
MAINTAINER_API_KEY=${MAINTAINER_API_KEY}
HERMES_WEBHOOK_SECRET=${HERMES_WEBHOOK_SECRET}
WEBHOOK_SECRET=${HERMES_WEBHOOK_SECRET}
WEBHOOK_ENABLED=true
WEBHOOK_PORT=${WEBHOOK_PORT}
WEBHOOK_HOST=${WEBHOOK_HOST}
OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
OPENAI_API_KEY=${OPENAI_API_KEY:-}
GOOGLE_API_KEY=${GOOGLE_API_KEY:-}
GEMINI_API_KEY=${GEMINI_API_KEY:-}
XAI_API_KEY=${XAI_API_KEY:-}
ENV
chmod 600 "$HERMES_HOME/.env" || true

if [[ "${ENABLE_MAINTAINER_POLL:-false}" == "true" ]]; then
  (
    while true; do
      echo "[privacy-atlas poll] running maintainer queue poll"
      hermes chat -Q -q 'You are the Privacy Atlas Hermes maintainer. Poll the Atlas contribution review queue using the configured Privacy Atlas maintainer MCP tools. For each pending contribution: inspect graph context, verify links and safety, classify commercial/affiliate metadata, grant a verified badge only when confident, reject only if clearly wrong/broken/harmful, otherwise skip. If the queue is empty, say so briefly.' || true
      sleep "${MAINTAINER_POLL_SECONDS:-1800}"
    done
  ) &
fi

echo "Starting Hermes webhook gateway on ${WEBHOOK_HOST}:${WEBHOOK_PORT}"
exec hermes gateway run

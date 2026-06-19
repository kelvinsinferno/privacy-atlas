# Privacy Atlas Hermes Render service

This directory packages a dedicated Render web service that runs Hermes's webhook gateway for Privacy Atlas.

Final public receiver after the Render custom domain is attached:

```text
https://hermes.privacyatlas.xyz/webhooks/privacy-atlas
```

## Render service settings

Create a new Render **Blueprint** from this repository. The root `render.yaml` defines the service.

Blueprint defaults in this repo:

- Service name: `privacy-atlas-hermes`
- Runtime: Docker
- Dockerfile path: `deploy/hermes-render/Dockerfile`
- Docker build context directory: repository root
- Plan: `free` in `render.yaml` because the current Render workspace rejected `starter` creation until billing is attached. Upgrade the created service to `starter` in Render after billing is attached if reliable real-time webhooks matter.
- Health check path: `/health`
- Custom domain: `hermes.privacyatlas.xyz`

Free tier sleeps and can miss webhook POSTs; queue polling still catches dropped work if polling is enabled and the service is awake.

## Required environment variables

Set these in the Render service dashboard:

```text
MAINTAINER_API_KEY=<same key used by /api/maintainer/* and /mcp-maintainer>
HERMES_WEBHOOK_SECRET=<same secret configured in Vercel>
HERMES_MODEL_PROVIDER=xai
HERMES_MODEL=grok-4.3
XAI_API_KEY=*** provider key from .env.vercel>
```

You may use another Hermes-supported provider instead, for example `openrouter` with `OPENROUTER_API_KEY` or `anthropic` with `ANTHROPIC_API_KEY`, but Render cannot use the local desktop's OpenAI Codex OAuth login. A server-side API key or OAuth credential configured for the Render environment is required.

Optional polling backstop:

```text
ENABLE_MAINTAINER_POLL=true
MAINTAINER_POLL_SECONDS=1800
```

Render also sets `PORT`; `start.sh` maps that to Hermes `WEBHOOK_PORT`.

## DNS

After Render creates the service, add the custom domain in Render:

```text
hermes.privacyatlas.xyz
```

Then create the CNAME Render gives you, usually of the form:

```text
hermes.privacyatlas.xyz CNAME <service-name>.onrender.com
```

## Vercel

After the Render custom domain is live and `/health` works, set in Vercel Project → Settings → Environment Variables:

```text
HERMES_WEBHOOK_URL=https://hermes.privacyatlas.xyz/webhooks/privacy-atlas
HERMES_WEBHOOK_SECRET=<same value as Render HERMES_WEBHOOK_SECRET>
```

Redeploy Privacy Atlas after changing env vars.

## Verification

```bash
curl https://hermes.privacyatlas.xyz/health
```

Expected:

```json
{"status":"ok","platform":"webhook"}
```

Then send a signed POST whose body HMAC is in `X-Hub-Signature-256: sha256=<hex>`.

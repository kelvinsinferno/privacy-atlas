FROM python:3.11-slim

ARG HERMES_AGENT_REF=main

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HERMES_HOME=/data/hermes \
    WEBHOOK_ENABLED=true \
    WEBHOOK_PORT=10000

RUN apt-get update \
    && apt-get install -y --no-install-recommends git curl ca-certificates bash \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt
RUN git clone --depth 1 --branch "$HERMES_AGENT_REF" https://github.com/NousResearch/hermes-agent.git hermes-agent \
    || (git clone https://github.com/NousResearch/hermes-agent.git hermes-agent && cd hermes-agent && git checkout "$HERMES_AGENT_REF")

WORKDIR /opt/hermes-agent
RUN pip install --upgrade pip setuptools wheel \
    && pip install '.[messaging,mcp]'

COPY deploy/hermes-render/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 10000
CMD ["/app/start.sh"]

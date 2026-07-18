# syntax=docker/dockerfile:1.7

# Bun is only used to install and compile. The shipped image contains the smaller, supported
# Next.js standalone Node runtime and none of the build toolchain or development dependencies.
FROM oven/bun:1-alpine AS build-base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM build-base AS deps
COPY --link package.json bun.lock ./
RUN --mount=type=cache,id=nyanovel-bun,target=/root/.bun/install/cache,sharing=locked \
    bun install --frozen-lockfile --no-progress --no-summary

# Source changes reuse the dependency layer; only package.json or bun.lock invalidates install.
FROM build-base AS builder
COPY --link --from=deps /app/node_modules ./node_modules
COPY --link . .
RUN bun run build

# Reuse the official Node build, but copy only the runtime binary and its two dynamic C++
# dependencies into a clean matching Alpine base. npm, Yarn, headers, and Corepack are build tools
# and would otherwise add ~30 MB uncompressed to a server that only runs `node server.js`.
FROM node:22-alpine3.22 AS node-runtime

FROM alpine:3.22 AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

LABEL org.opencontainers.image.title="NyaNovel" \
      org.opencontainers.image.description="A refined browser client for NovelAI image generation, built with Next.js and nekoai-js." \
      org.opencontainers.image.source="https://github.com/Nya-Foundation/NyaNovel" \
      org.opencontainers.image.licenses="MIT"

COPY --link --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --link --from=node-runtime /usr/lib/libgcc_s.so.1 /usr/lib/libstdc++.so.6* /usr/lib/

# Next standalone contains server.js and only its traced production dependencies. Static and
# public files are deliberately separate because Next does not copy them into standalone output.
# Numeric ownership is required with `--link`: linked layers do not read /etc/passwd. Alpine's
# built-in unprivileged `nobody` account is 65534:65534, so no user-creation layer is needed.
COPY --link --from=builder --chown=65534:65534 /app/.next/standalone ./
COPY --link --from=builder --chown=65534:65534 /app/.next/static ./.next/static
COPY --link --from=builder --chown=65534:65534 /app/public ./public

USER nobody
EXPOSE 3000

# BusyBox wget is already present in Alpine, so this adds health reporting without another package
# or image layer. The start period covers cold starts on constrained hosts.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider "http://127.0.0.1:${PORT}/" || exit 1

STOPSIGNAL SIGTERM
CMD ["node", "server.js"]

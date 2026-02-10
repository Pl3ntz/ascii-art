# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM oven/bun:1-slim AS deps

WORKDIR /app

COPY package.json bun.lockb* ./

RUN bun install

# =============================================================================
# Stage 2: Builder
# =============================================================================
FROM oven/bun:1-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build

# =============================================================================
# Stage 3: Runtime
# =============================================================================
FROM oven/bun:1-slim AS runtime

WORKDIR /app

RUN useradd --create-home --shell /bin/bash worker 2>/dev/null || true

COPY --from=deps --chown=1000:1000 /app/node_modules ./node_modules
COPY --from=builder --chown=1000:1000 /app/dist ./dist
COPY --chown=1000:1000 package.json ./

EXPOSE 4173

CMD ["bun", "run", "preview", "--", "--host", "0.0.0.0"]

# Stage 1: Build
FROM oven/bun:1-alpine AS Build

WORKDIR /usr/src/app

# Copy root files to resolve workspaces
COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ui/package.json ./packages/ui/

RUN bun install --prod --no-save --no-frozen-lockfile

# Copy the rest of the monorepo
COPY . .

RUN bunx turbo build --filter=api

# Stage 2: Serve
FROM oven/bun:1-alpine AS serve
WORKDIR /usr/src/app

# Install postgres client for health checks/migrations if needed
RUN apk add --no-cache postgresql-client netcat-openbsd

# Copy workspace configs
COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ui/package.json ./packages/ui/

# Install only production dependencies
RUN bun install --prod --no-save

# Copy build artifacts from Stage 1
COPY --from=Build /usr/src/app/apps/api/dist ./apps/api/dist
COPY --from=Build /usr/src/app/apps/api/migrations ./apps/api/migrations
COPY --from=Build /usr/src/app/apps/api/entrypoint.prod.sh ./apps/api/entrypoint.prod.sh

WORKDIR /usr/src/app/apps/api
RUN chmod +x entrypoint.prod.sh

EXPOSE 5473

CMD ["./entrypoint.prod.sh"]
# Stage 1: Build
FROM oven/bun:1-alpine AS Build

WORKDIR /usr/src/app

# Copy root files to resolve workspaces
COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ui/package.json ./packages/ui/

RUN bun install

COPY . .

RUN bunx turbo build --filter=api

# Stage 2: Serve
FROM oven/bun:1-alpine AS serve
WORKDIR /usr/src/app

RUN apk add --no-cache postgresql-client netcat-openbsd

# Copy configs for production runtime
COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ui/package.json ./packages/ui/

# Now it will work because the workspace is complete
RUN bun install --prod --no-save

# Copy build artifacts (Keep this as you have it)
COPY --from=Build /usr/src/app/apps/api/dist ./apps/api/dist
COPY --from=Build /usr/src/app/apps/api/migrations ./apps/api/migrations
COPY --from=Build /usr/src/app/apps/api/entrypoint.prod.sh ./apps/api/entrypoint.prod.sh

WORKDIR /usr/src/app/apps/api
RUN chmod +x entrypoint.prod.sh

EXPOSE 5473

CMD ["./entrypoint.prod.sh"]
FROM oven/bun:1-alpine AS Build
WORKDIR /usr/src/app

# Copy root config
COPY package.json bun.lock turbo.json ./

# Copy ALL package.json files from the workspaces
COPY apps/api/package.json ./apps/api/
COPY apps/web-app/package.json ./apps/web-app/
COPY apps/admin-fe/package.json ./apps/admin-fe/
COPY packages/ui/package.json ./packages/ui/

RUN bun install --frozen-lockfile

# Now copy the source and build
COPY . .

RUN bunx turbo build --filter=api

FROM oven/bun:1-alpine AS serve

WORKDIR /usr/src/app

RUN apk add --no-cache postgresql-client netcat-openbsd

# Repeat the metadata copy for the production install
COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web-app/package.json ./apps/web-app/
COPY apps/admin-fe/package.json ./apps/admin-fe/
COPY packages/ui/package.json ./packages/ui/

# Production install
RUN bun install --prod --no-save --no-frozen-lockfile

# Copy artifacts
COPY --from=Build /usr/src/app/apps/api/dist ./apps/api/dist
COPY --from=Build /usr/src/app/apps/api/migrations ./apps/api/migrations
COPY --from=Build /usr/src/app/apps/api/entrypoint.prod.sh ./apps/api/entrypoint.prod.sh

WORKDIR /usr/src/app/apps/api
RUN chmod +x entrypoint.prod.sh

EXPOSE 5473

CMD ["./entrypoint.prod.sh"]
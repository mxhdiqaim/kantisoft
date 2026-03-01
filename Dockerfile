# Stage 1 Build env
FROM oven/bun:1-alpine AS Build

WORKDIR /usr/src/app

COPY package.json bun.lock ./

# Install all dependencies (including devDep for building)
RUN bun install

COPY . .

# Build the TypeScript code into a /dist dir
RUN bun run build

# Stage 2 Production Runtime env
# Use bun image for running
FROM oven/bun:1-alpine AS serve

WORKDIR /usr/src/app

# Install PostgreSQL client tools for pg_isready
RUN apk add postgresql-client netcat-openbsd

COPY package.json bun.lock ./

# Install only production dep
RUN bun install --prod --frozen-lockfile

# Copy the built application files from the 'build' stage
COPY --from=Build /usr/src/app/dist ./dist

# Copy the migrations folder
COPY --from=Build /usr/src/app/migrations ./migrations

# Copy the prod entrypoint script
COPY entrypoint.prod.sh .
RUN chmod +x entrypoint.prod.sh

EXPOSE 5473

CMD ["./entrypoint.prod.sh"]
#!/bin/sh

# Check if required environment variables are set
if [ -z "$DB_CONNECTION_STRING" ]; then
  echo "Error: DB_CONNECTION_STRING environment variable is not set."
  exit 1
fi

echo "Waiting for the database..."

# Use the connection string for the readiness check
until pg_isready -d "$DB_CONNECTION_STRING"; do
  echo "Database is unavailable - sleeping"
  sleep 1
done

echo "Postgres is ready. Running migrations..."

# Run database migrations using the compiled JavaScript file
bun run migrate:prod

echo "Migrations complete. Seeding data..."

# Run database seeds
bun run seed:prod

echo "Seeding complete. Starting the API server..."

# Use exec to ensure the 'bun start' process keeps the container alive
exec bun start
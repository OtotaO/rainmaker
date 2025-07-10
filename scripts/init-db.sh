#!/bin/bash
set -e

echo "Initializing database..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until PGPASSWORD=postgres psql -h "localhost" -U "postgres" -p 54322 -d "postgres" -c '\q' > /dev/null 2>&1; do
  echo "PostgreSQL is not ready yet. Retrying in 5 seconds..."
  sleep 5
done

echo "Creating database if it doesn't exist..."
PGPASSWORD=postgres psql -h "localhost" -U "postgres" -p 54322 -d "postgres" -c "CREATE DATABASE rainmaker;" || echo "Database already exists or could not be created"

echo "Running migrations..."
cd packages/discovery
bunx prisma migrate dev --name init

echo "Database initialization complete!"

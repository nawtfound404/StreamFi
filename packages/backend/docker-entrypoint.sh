#!/bin/sh
set -e

# Run Prisma migrations (safe in dev)
if [ -f ./node_modules/.bin/prisma ]; then
  npx prisma migrate deploy || true
fi

# Start the application
exec node -r tsconfig-paths/register dist/server.js

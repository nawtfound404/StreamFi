#!/bin/sh
set -e

# Start the application
exec node -r tsconfig-paths/register dist/server.js

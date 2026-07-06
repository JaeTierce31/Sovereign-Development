#!/usr/bin/env bash
# Create a Turso database and run the initial migration.
#
# Requirements:
#   curl installed, turso CLI (npm i -g @turso/cli), or manual setup.
#
# Usage:
#   chmod +x scripts/setup-turso.sh
#   ./scripts/setup-turso.sh

set -euo pipefail

echo "=== Turso Database Setup ==="
echo ""
echo "Option A — Turso CLI (recommended):"
echo "  npm install -g @turso/cli"
echo "  turso auth login"
echo "  turso db create peregrine-prod"
echo "  turso db show peregrine-prod          # note the URL"
echo "  turso db tokens create peregrine-prod  # note the token"
echo ""
echo "Then export and migrate:"
echo "  export TURSO_DB_URL=libsql://peregrine-prod-<org>.turso.io"
echo "  export TURSO_AUTH_TOKEN=<token>"
echo "  npm run db:migrate"
echo ""
echo "Option B — Turso web dashboard:"
echo "  1. Create a database at https://turso.tech"
echo "  2. Copy the URL and token from the dashboard"
echo "  3. Set them in your .env.local and run: npm run db:migrate"

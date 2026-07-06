#!/usr/bin/env bash
# Deploy the Peregrine collaboration Durable Object worker to Cloudflare.
#
# Requirements:
#   export CLOUDFLARE_API_TOKEN="..."   # Cloudflare API token with Edit Workers permission
#
# Usage:
#   chmod +x scripts/deploy-worker.sh
#   CLOUDFLARE_API_TOKEN=your_token ./scripts/deploy-worker.sh

set -euo pipefail

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN is not set."
  echo "Get one from: https://dash.cloudflare.com/profile/api-tokens"
  echo "Required permissions: Workers Scripts:Edit, Workers KV Storage:Edit"
  exit 1
fi

export CLOUDFLARE_API_TOKEN

echo "→ Installing worker dependencies …"
cd workers/collab-worker
npm install

echo "→ Deploying peregrine-collab worker …"
npx wrangler deploy

echo ""
echo "✓ Worker deployed!"
echo "  URL: https://peregrine-collab.<your-subdomain>.workers.dev"
echo "  Set collab.peregrine.dev CNAME to this URL in your DNS panel."

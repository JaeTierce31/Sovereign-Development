#!/usr/bin/env python3
"""
Peregrine Bootstrap — adds all GitHub Actions secrets in one shot.

Usage:
    export GITHUB_TOKEN="ghp_..."          # PAT with repo + secrets:write scope
    export CF_API_TOKEN="..."              # Cloudflare API token (Edit Workers)
    export TURSO_DB_URL="libsql://..."     # From turso.tech dashboard
    export TURSO_AUTH_TOKEN="..."
    export CLERK_SECRET_KEY="sk_..."       # From clerk.com dashboard
    export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
    export STRIPE_SECRET_KEY="sk_..."      # From stripe.com dashboard
    export STRIPE_WEBHOOK_SECRET="whsec_..."
    python3 scripts/bootstrap.py

The script will also print your Cloudflare Account ID (already known: 53528ec5aa0c18c03cb6fddc2ad38af1)
so you can copy it into the Vercel environment variables panel.
"""

import base64
import json
import os
import sys
import urllib.request
import urllib.error

try:
    from nacl import encoding, public
except ImportError:
    print("Installing PyNaCl …")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyNaCl", "-q"])
    from nacl import encoding, public

REPO = "JaeTierce31/Peregrine.ai"
CF_ACCOUNT_ID = "53528ec5aa0c18c03cb6fddc2ad38af1"

REQUIRED = [
    "GITHUB_TOKEN",
    "CF_API_TOKEN",
    "TURSO_DB_URL",
    "TURSO_AUTH_TOKEN",
    "CLERK_SECRET_KEY",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
]

SECRETS = {
    "CF_ACCOUNT_ID":                       CF_ACCOUNT_ID,
    "CF_API_TOKEN":                        os.environ.get("CF_API_TOKEN", ""),
    "TURSO_DB_URL":                        os.environ.get("TURSO_DB_URL", ""),
    "TURSO_AUTH_TOKEN":                    os.environ.get("TURSO_AUTH_TOKEN", ""),
    "CLERK_SECRET_KEY":                    os.environ.get("CLERK_SECRET_KEY", ""),
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY":   os.environ.get("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", ""),
    "STRIPE_SECRET_KEY":                   os.environ.get("STRIPE_SECRET_KEY", ""),
    "STRIPE_WEBHOOK_SECRET":               os.environ.get("STRIPE_WEBHOOK_SECRET", ""),
}


def gh(method, path, body=None, token=None):
    url = f"https://api.github.com{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def encrypt_secret(public_key_b64: str, secret_value: str) -> str:
    pk = public.PublicKey(public_key_b64.encode(), encoding.Base64Encoder())
    box = public.SealedBox(pk)
    encrypted = box.encrypt(secret_value.encode())
    return base64.b64encode(encrypted).decode()


def main():
    missing = [k for k in REQUIRED if not os.environ.get(k)]
    if missing:
        print(f"ERROR: Missing environment variables: {', '.join(missing)}")
        print(__doc__)
        sys.exit(1)

    token = os.environ["GITHUB_TOKEN"]

    print(f"→ Fetching repo public key for {REPO} …")
    pk_data = gh("GET", f"/repos/{REPO}/actions/public-key", token=token)
    key_id = pk_data["key_id"]
    public_key = pk_data["key"]

    ok = []
    fail = []
    for name, value in SECRETS.items():
        if not value:
            print(f"  SKIP {name} (empty)")
            continue
        encrypted = encrypt_secret(public_key, value)
        try:
            gh(
                "PUT",
                f"/repos/{REPO}/actions/secrets/{name}",
                body={"encrypted_value": encrypted, "key_id": key_id},
                token=token,
            )
            print(f"  ✓  {name}")
            ok.append(name)
        except urllib.error.HTTPError as e:
            print(f"  ✗  {name}: {e.read().decode()}")
            fail.append(name)

    print(f"\n{'='*50}")
    print(f"Done. {len(ok)} secrets set, {len(fail)} failed.")
    print(f"\nCloudflare Account ID (already included): {CF_ACCOUNT_ID}")
    print("""
Next steps:
  1. Go to vercel.com → Add New Project → Import JaeTierce31/Peregrine.ai
     • Framework preset: Next.js
     • Root directory: /  (default)
     • Add env vars from .env.example (Turso, Clerk, Stripe, CF_ACCOUNT_ID)
     • Deploy — Vercel will auto-deploy every push to main from now on.

  2. Deploy the Cloudflare collaboration worker:
       export CLOUDFLARE_API_TOKEN=$CF_API_TOKEN
       cd workers/collab-worker && npm install && npx wrangler deploy

  3. Run the Turso migration:
       npm run db:migrate

  4. Set peregrine.dev → Vercel and collab.peregrine.dev → Cloudflare Worker.
""")


if __name__ == "__main__":
    main()

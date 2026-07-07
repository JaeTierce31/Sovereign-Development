# Sovereign-Development (Peregrine) — Claude Code Context

Mobile-first, edge-native collaborative cloud IDE. Next.js 14 App Router PWA, Clerk v7 auth, yjs CRDT collab, Cloudflare Workers, Supabase Postgres via Drizzle, Stripe billing.

## Architecture

```
app/
  (mobile)/          # Mobile-first routes (EditorDeck, ActionBar)
  (desktop)/         # Desktop IDE shell
  api/
    stripe/[...all]/ # Stripe webhook — public route
    deploy/          # Code execution triggers
    execute/
components/
  mobile/            # MobileEditor, MobileTerminal, MobileKeyboardRow
  desktop/           # DesktopIDE
  collaboration/     # CollabProvider (yjs), CursorPresence
  shared/            # Editor (Monaco), Terminal (xterm.js)
lib/
  auth.ts            # requireAuth(), getCurrentUser() — Clerk v7 async
  db.ts              # Drizzle ORM → Turso/libSQL
  collab.ts          # yjs + Cloudflare Worker WebSocket
  stripe.ts          # Stripe SDK helpers
  deploy.ts          # WebContainer / sandbox deploy
workers/
  collab-worker/     # Cloudflare Worker (wrangler) — yjs WS relay
drizzle/
  schema.ts          # DB schema
  migrations/        # SQL migration files
```

## Key Constraints

- **Next.js 14** (not 15) — do not upgrade without explicit request; Clerk v7 peer-dep conflict managed via `.npmrc legacy-peer-deps=true`
- **Clerk v7** — `auth()` is async (`await auth()`); `ClerkProvider` must be inside `<body>`; use `<Show when="signed-in/out">` not `<SignedIn>`/`<SignedOut>`
- **COEP/COOP headers** required for xterm.js SharedArrayBuffer — set in `vercel.ts`
- **Public routes**: `/`, `/sign-in(.*)`, `/sign-up(.*)`, `/api/stripe(.*)`
- **Supabase Postgres** via Drizzle (`DATABASE_URL`, transaction pooler); the earlier Turso/libSQL design is superseded
- **No pnpm** — project uses npm + package-lock.json exclusively

## Environment Variables

| Variable | Where Used | Value / Source |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client-side | Clerk dashboard |
| `CLERK_SECRET_KEY` | Clerk server-side | Clerk dashboard |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe client | Stripe dashboard |
| `STRIPE_SECRET_KEY` | Stripe server | Stripe dashboard |
| `STRIPE_RESTRICTED_KEY` | Stripe webhook validation | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook | Stripe → Webhooks → endpoint secret |
| `NEXT_PUBLIC_CF_WORKER_URL` | Cloudflare collab worker WS URL | `wss://peregrine-collab.<subdomain>.workers.dev` after deploy |
| `DATABASE_URL` | Supabase Postgres (Drizzle) | Supabase dashboard → Settings → Database → Connection string (Transaction mode) |

All vars must be set in Vercel → Settings → Environment Variables for Production + Preview.

## Supabase Project

- **Project**: `peregrine-ai` (see Supabase dashboard, org JAY•TIERS•INNOVATION)
- **Keys/URL**: never commit them — set `DATABASE_URL` (and any client keys) as
  environment variables in Vercel / `.env.local`. A previous revision of this file in
  the `Peregrine.ai` repo embedded the anon key; that key must be rotated (ecosystem
  review finding 4.4-1) and no key belongs in this file.
- **Tables**: `users`, `projects`, `files` (migrations already applied)
- **DATABASE_URL**: Supabase → Settings → Database → Connection string (Transaction pooler, port 6543)

## Git & PR Workflow

- **Development branch**: create `claude/*` feature branches
- **Main is protected** — never push directly; always PR
- **Squash merge** PRs to keep main history clean
- **After squash merge**: rebase feature branch with `git reset --hard origin/main` + `git cherry-pick <new-commits>` to avoid add/add conflicts on next PR
- CI runs `tsc --noEmit` + `next lint` on every PR push
- Vercel auto-deploys previews on PRs, production on main merge

## Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
npm run db:migrate   # Apply Drizzle migrations (Supabase Postgres)
npm run db:studio    # Drizzle Studio (local DB UI)
```

## Pending Setup

- [x] Supabase DB created + migrations applied (`zaeximrqiulvhzynnhfe`)
- [ ] Add `DATABASE_URL` to Vercel (from Supabase → Settings → Database → Transaction pooler URL)
- [ ] Obtain `STRIPE_WEBHOOK_SECRET`: Stripe dashboard → Webhooks → Add endpoint → `https://peregrine-ai-sandy.vercel.app/api/stripe/webhook` → events: `customer.subscription.*`
- [ ] Deploy Cloudflare Worker: `CLOUDFLARE_API_TOKEN=xxx ./scripts/deploy-worker.sh` (get token from dash.cloudflare.com/profile/api-tokens with Workers:Edit permission)
- [ ] Set `NEXT_PUBLIC_CF_WORKER_URL` in Vercel after worker deploy
- [ ] DNS: `peregrine.dev` A record → Vercel; `collab.peregrine.dev` CNAME → worker URL

## Claude Code Workflow Conventions

### When working on this repo:
1. Always `git fetch origin && git log --oneline origin/main -5` before starting — check what's on main
2. Create feature branches as `claude/<short-description>`
3. Run `npm run typecheck && npm run lint` before pushing
4. PRs: squash merge, write commit messages with the "why" not the "what"
5. After Vercel deployment, verify with `list_deployments` MCP tool — target `prj_E64nmhOYtuqlJaOZAsydfgl21VtA` team `sovereign-dominion`

### Vercel MCP targets:
- Project ID: `prj_E64nmhOYtuqlJaOZAsydfgl21VtA`
- Team: `sovereign-dominion`
- Production alias: `peregrine-ai-sandy.vercel.app`

### GitHub MCP scope:
- Repo: `jaetierce31/sovereign-development`
- Never interact with other repos

### Known pitfalls:
- `npm ci` on Vercel will ERESOLVE without `.npmrc legacy-peer-deps=true` — file exists, do not remove
- `vercel.ts` headers must use `[{key, value}]` array format, not object format from `routes.header()`
- `ClerkProvider` must wrap only `{children}` inside `<body>`, not wrap `<html>`
- Squash merges cause add/add conflicts if branch is not rebased — always reset+cherry-pick

## Skills & Automation

Use `/review` before merging any significant PR.
Use `/simplify` after large refactors.
Use `subscribe_pr_activity` MCP tool to watch PRs for CI failures and auto-fix.
Spawn parallel agents for independent tasks (e.g., fix TypeScript errors while writing tests).

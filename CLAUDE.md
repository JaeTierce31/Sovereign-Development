# Peregrine.ai — Claude Code Context

Mobile-first, edge-native collaborative cloud IDE. Next.js 14 App Router PWA, Clerk v7 auth, yjs CRDT collab, Cloudflare Workers, Turso/libSQL DB, Stripe billing.

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
- **Turso** not Postgres/Supabase — use `@libsql/client` via Drizzle
- **No pnpm** — project uses npm + package-lock.json exclusively

## Environment Variables

| Variable | Where Used |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client-side |
| `CLERK_SECRET_KEY` | Clerk server-side |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe client |
| `STRIPE_SECRET_KEY` | Stripe server |
| `STRIPE_RESTRICTED_KEY` | Stripe webhook validation |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook (obtain from dashboard) |
| `NEXT_PUBLIC_CF_WORKER_URL` | Cloudflare collab worker WS URL |
| `TURSO_DB_URL` | Turso database URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |

All vars must be set in Vercel → Settings → Environment Variables for Production + Preview.

## Git & PR Workflow

- **Development branch**: `claude/init-peregrine-repo-ovhoe` (or create new `claude/*` branches)
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
npm run db:migrate   # Apply Drizzle migrations to Turso
npm run db:studio    # Drizzle Studio (local DB UI)
```

## Pending Setup

- [ ] Set `TURSO_DB_URL` + `TURSO_AUTH_TOKEN` in Vercel → run `npm run db:migrate`
- [ ] Obtain `STRIPE_WEBHOOK_SECRET` from Stripe dashboard → add to Vercel
- [ ] Deploy Cloudflare Worker: `./scripts/deploy-worker.sh` (needs `CF_API_TOKEN`)
- [ ] DNS: point `peregrine.dev` → Vercel; `collab.peregrine.dev` → Cloudflare Worker
- [ ] Set `NEXT_PUBLIC_CF_WORKER_URL=wss://collab.peregrine.dev` in Vercel Production

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
- Repo: `jaetierce31/peregrine.ai`
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

# Migration runbook — Peregrine.ai + Peregrine.dev → Sovereign-Development

Decision **D2** of the ecosystem review
([`Sovereign-Dominion/docs/ECOSYSTEM.md`](https://github.com/JaeTierce31/Sovereign-Dominion/blob/main/docs/ECOSYSTEM.md) §5).
This runbook is written to be executed as its own reviewed change, by a person or
agent with access to the GitHub, Vercel, Clerk, Stripe, and Cloudflare accounts
involved. Nothing here has been executed yet.

## Principles

- **History-preserving.** Peregrine.ai's commit history (blame, the "why" in commit
  messages) survives the move. No squash-copying a source tree into an empty repo.
- **No secrets travel.** The Supabase anon key + project URL committed in
  `Peregrine.ai/CLAUDE.md` are rotated first and never imported (finding 4.4-1).
- **One truthful stack description.** Peregrine.ai's README (Turso/Codeium/Fly.io)
  and CLAUDE.md (Supabase/Clerk/Drizzle) disagree; the imported docs get one pass to
  state the actual stack (finding 4.4-2).
- **Leave the sprawl behind.** Only `main` (plus any branch with unmerged work worth
  keeping, reviewed by name) is imported — not the several hundred stale remote heads.

## Step 0 — pre-flight

1. Rotate the Supabase anon key in the `peregrine-ai` project; move all runtime
   configuration to Vercel environment variables. Rewrite `CLAUDE.md` to reference
   variables by name only.
2. Inventory unmerged branches on Peregrine.ai worth keeping:
   `git branch -r --no-merged origin/main` — expect to keep few or none.
3. Confirm Peregrine.dev contains nothing but its README stub (it did at review time).

## Step 1 — import Peregrine.ai with history

```bash
git clone https://github.com/JaeTierce31/Sovereign-Development.git
cd Sovereign-Development
git checkout -b import/peregrine-ai
git remote add peregrine https://github.com/JaeTierce31/Peregrine.ai.git
git fetch peregrine main
git merge --allow-unrelated-histories peregrine/main \
  -m "feat: import Peregrine IDE from Peregrine.ai (history-preserving)"
```

Resolve the trivial conflicts (both repos have `README.md`/`LICENSE`): this repo's
charter `README.md` wins as the front page; move the imported product README to
`docs/PEREGRINE.md` (or merge its content into the charter) in the same commit.

If a subdirectory layout is preferred (e.g. everything under `ide/` to leave room for
future workspaces), use `git filter-repo --to-subdirectory-filter ide` on a scratch
clone of Peregrine.ai *before* the merge, and fetch from that scratch clone instead.

## Step 2 — make it build here

1. `npm ci && npm run typecheck && npm run lint` — must pass before the PR leaves
   draft (the `.npmrc legacy-peer-deps=true` file must survive the import; Clerk v7
   peer-dep constraint).
2. Do the one-pass doc reconciliation (truthful stack description; single README).
3. Open the import PR as draft; review; merge.

## Step 3 — re-point the deployment

1. Vercel: point the existing project (`prj_E64nmhOYtuqlJaOZAsydfgl21VtA`, team
   `sovereign-dominion`) at `JaeTierce31/Sovereign-Development`, or create a new
   project and migrate the environment variables. Preview-deploy from a branch first.
2. Verify: production alias serves, auth (Clerk) works, Stripe webhook still
   validates, collab worker WebSocket connects.
3. DNS (`peregrine.dev`, `collab.peregrine.dev`) needs no change if the Vercel
   project is reused; re-check if a new project was created.

## Step 4 — retire the sources

1. `Peregrine.ai`: final commit updating README to "moved to Sovereign-Development";
   archive the repo on GitHub (Settings → Archive). Archiving preserves the old
   PR/issue history read-only.
2. `Peregrine.dev`: same notice; archive.
3. Update `Sovereign-Dominion/docs/ECOSYSTEM.md` §7: move the consolidation row
   ⚪ → ✅ and note the date.

## Rollback

Until Step 4, the source repos are untouched and the Vercel project can be pointed
back at `Peregrine.ai` in one setting. Do not archive the sources until production
has served from this repo without incident for a reasonable soak period.

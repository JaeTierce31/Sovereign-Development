# Sovereign-Development

**Home of 🦅 Peregrine — the developer platform of the Sovereign Ecosystem.**

> Part of the **Sovereign Ecosystem**. The full six-repo map and the consolidation
> decisions behind this repo live in
> [`Sovereign-Dominion/docs/ECOSYSTEM.md`](https://github.com/JaeTierce31/Sovereign-Dominion/blob/main/docs/ECOSYSTEM.md).

## What this repository is

Sovereign-Development is the permanent home of **Peregrine**, the mobile-first,
edge-native collaborative cloud IDE — and, by role, the **IDE developer platform for
Sovereign Dominion** and the wider ecosystem: the tooling the ecosystem is built *with*.

It consolidates two repositories (decision **D2** of the ecosystem review):

| Source repo | What it contributed | How |
|---|---|---|
| [`Peregrine.ai`](https://github.com/JaeTierce31/Peregrine.ai) | The working Peregrine IDE — Next.js 14 App Router PWA (Monaco + xterm.js, yjs CRDT collaboration via a Cloudflare Worker, Clerk v7 auth, Drizzle ORM, Stripe billing, Vercel deployment) — with its full commit history | History-preserving merge (this repo's history contains Peregrine.ai's); runbook: [`docs/MIGRATION.md`](docs/MIGRATION.md) |
| [`Peregrine.dev`](https://github.com/JaeTierce31/Peregrine.dev) | Nothing but the name (an empty scaffold reserving the `peregrine.dev` domain identity) | Superseded notice; archive |

**Status: code imported; deployment cutover pending.** The Peregrine source and its
history now live here. The deployed Vercel project still builds from `Peregrine.ai`
until the cutover in `docs/MIGRATION.md` §3 is executed — until then, treat
`Peregrine.ai` as frozen except for that cutover, and land new work here.

**Product documentation:** [`docs/PEREGRINE.md`](docs/PEREGRINE.md) (the product
README) and [`CLAUDE.md`](CLAUDE.md) (agent/development context).

## Place in the ecosystem

```
┌────────────────────────────────────────────────────────────────┐
│ SURFACES     inspector apps · attestation portals · reporting · │
│              Peregrine IDE (this repo)                          │
├────────────────────────────────────────────────────────────────┤
│ DOMAINS      Housing (Sovereign-Dignity) · AEC + Visual          │
│              (Sovereign-Dominion) · Development (planned, here)  │
├────────────────────────────────────────────────────────────────┤
│ KERNEL       @sovereign/kernel (Sovereign-Dominion) —            │
│              Intent → Gate → Verify → Execute → Observe → Seal   │
├────────────────────────────────────────────────────────────────┤
│ CONSTITUTION machine-checkable charters                          │
└────────────────────────────────────────────────────────────────┘
```

### Kernel integration — planned, honestly labeled

Per the ecosystem's crypto-honesty discipline: **Peregrine has no kernel integration
today.** The target design is a **Development domain** on `@sovereign/kernel` —
developer-platform actions with trust consequences (a production deploy, a release
publish, a charter change merged) submitted as Intents, gated by a development charter
(e.g. `deploy.requires_green_ci`, `release.dual_attestation`), appended to the
tamper-evident audit MMR, and sealed. That would make Peregrine the surface where the
ecosystem builds itself under its own constitution.

This integration is gated on `@sovereign/kernel` being published as a package
(Sovereign-Dominion `ROADMAP.md` Tier 2; ecosystem decision **D3**): this repo will
not hand-mirror the kernel contract the way Sovereign-Dignity does — one mirror in the
ecosystem is already one too many (its ADR-004 says as much).

## Sibling repositories

| Repo | Role |
|---|---|
| **Sovereign-Dominion** | Ecosystem anchor: `@sovereign/kernel` + Constitution · AEC and Visual domains · reference demo. |
| **Sovereign-Dignity** | Flagship domain: HUD NSPIRE housing inspection (continuation of `hmis-platform`). |
| **Peregrine.ai / Peregrine.dev** | Consolidated here; to be archived after the deployment cutover. |

## Next steps (in order)

1. **Rotate the Supabase anon key** that was committed in `Peregrine.ai`'s history
   (ecosystem review finding 4.4-1). The key was **not** imported into this repo's
   docs, but it remains in the source repo's git history — rotation is the only fix.
2. Re-point deployment (Vercel project / domains / worker) at this repo per
   [`docs/MIGRATION.md`](docs/MIGRATION.md) §3; verify auth, billing, and collab.
3. Archive `Peregrine.ai` and `Peregrine.dev` with pointers here (§4).
4. When `@sovereign/kernel` publishes, open the Development-domain integration as its
   own charter + implementation work.

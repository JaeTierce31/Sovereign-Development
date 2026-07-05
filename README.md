# Sovereign-Development

**Home of 🦅 Peregrine — the developer platform of the Sovereign Ecosystem.**

> Part of the **Sovereign Ecosystem**. The full six-repo map and the consolidation
> decisions behind this repo live in
> [`Sovereign-Dominion/docs/ECOSYSTEM.md`](https://github.com/JaeTierce31/Sovereign-Dominion/blob/main/docs/ECOSYSTEM.md).

## What this repository is

Sovereign-Development is the consolidation target and permanent home for
**Peregrine**, the mobile-first, edge-native collaborative cloud IDE — and, by role,
the **IDE developer platform for Sovereign Dominion** and the wider ecosystem: the
tooling the ecosystem is built *with*.

It consolidates two existing repositories (decision **D2** of the ecosystem review):

| Source repo | What it contributes | How |
|---|---|---|
| [`Peregrine.ai`](https://github.com/JaeTierce31/Peregrine.ai) | The working Peregrine IDE — Next.js 14 App Router PWA (Monaco + xterm.js, yjs CRDT collaboration via a Cloudflare Worker, Clerk v7 auth, Drizzle ORM, Stripe billing, Vercel deployment) and its full commit history | History-preserving import — see [`docs/MIGRATION.md`](docs/MIGRATION.md) |
| [`Peregrine.dev`](https://github.com/JaeTierce31/Peregrine.dev) | Nothing but the name (it is an empty scaffold reserving the `peregrine.dev` domain identity; the domain itself points at the Peregrine deployment) | Superseded notice + archive; no code to import |

**Status: charter only.** This repository currently contains this charter and the
migration runbook — the code import is deliberately a separate, reviewed cutover
(moving a deployed product also moves its Vercel/Clerk/Stripe/Cloudflare wiring), not
a side effect of the review that created this document. Until the import lands,
Peregrine's source of truth remains `Peregrine.ai`.

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
| **Peregrine.ai / Peregrine.dev** | Sources being consolidated here; archived after cutover. |

## Next steps (in order)

1. Rotate the Supabase key currently committed in `Peregrine.ai`'s `CLAUDE.md`
   (ecosystem review finding 4.4-1) — nothing secret is to be imported here.
2. Execute the import per [`docs/MIGRATION.md`](docs/MIGRATION.md).
3. Re-point deployment (Vercel project / domains / worker) at this repo; verify.
4. Archive `Peregrine.ai` and `Peregrine.dev` with pointers here.
5. When `@sovereign/kernel` publishes, open the Development-domain integration as its
   own charter + implementation work.

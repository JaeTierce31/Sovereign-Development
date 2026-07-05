# Peregrine.ai in the Sovereign Ecosystem

**The master six-repo map lives in
[`Sovereign-Dominion/docs/ECOSYSTEM.md`](https://github.com/JaeTierce31/Sovereign-Dominion/blob/main/docs/ECOSYSTEM.md).**

## Role

This repository holds **Peregrine**, the mobile-first, edge-native collaborative
cloud IDE — the **developer platform of the Sovereign Ecosystem**: the IDE developer
platform for Sovereign Dominion and the tooling the ecosystem is built with.

## Disposition — consolidating into Sovereign-Development

Per ecosystem decision **D2**, this repository (together with the empty
`Peregrine.dev` name-reservation repo) is being consolidated into
**[Sovereign-Development](https://github.com/JaeTierce31/Sovereign-Development)**,
Peregrine's permanent home. The migration is history-preserving; the runbook is
`Sovereign-Development/docs/MIGRATION.md`.

**Until that cutover executes, this repo remains Peregrine's source of truth** — the
deployed Vercel project builds from here. After cutover it will carry a moved-notice
and be archived.

## Pre-migration findings (from the ecosystem review)

1. **Rotate the committed Supabase key.** `CLAUDE.md` embeds a live Supabase anon key
   and project URL. Rotate it and move configuration to environment variables before
   the import; it must not travel to Sovereign-Development.
2. **Reconcile the stack docs.** The README (Turso/Codeium/ONNX/Fly.io) and
   `CLAUDE.md` (Supabase Postgres via Drizzle, Clerk v7) disagree; the import includes
   one pass to state the actual stack.
3. **Only `main` migrates.** The several hundred stale remote branches stay behind.

## Kernel integration — planned, honestly labeled

Peregrine has **no** integration with `@sovereign/kernel` today. The target design —
a Development domain where deploys/releases become gated, audited, sealed Intents —
is documented in Sovereign-Development's charter and is gated on the kernel being
published as a package. Stated as planned, per the ecosystem's crypto-honesty rule.

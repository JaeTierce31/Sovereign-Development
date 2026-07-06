# 🦅 Peregrine

> **Code at the speed of flight.**  
> The mobile‑first, edge‑native collaborative cloud IDE — the developer platform of the
> [Sovereign Ecosystem](https://github.com/JaeTierce31/Sovereign-Dominion/blob/main/docs/ECOSYSTEM.md).

Peregrine lets you write, run, and deploy full‑stack apps from any device – phone, tablet, or desktop – with zero configuration. It combines a gesture‑driven mobile editor, instant in‑browser execution (WebContainers), real‑time collaboration, and one‑click deployment to the global edge.

## 🚀 Try it now
**[peregrine.dev](https://peregrine.dev)** – works in your browser, no install required.  
For the full PWA experience: open on your phone, tap **Share → Add to Home Screen**.

## 📦 Tech Stack

The stack as actually built (reconciled with [`CLAUDE.md`](../CLAUDE.md), which is
authoritative for development):

| Layer                | Technology                                      |
|----------------------|-------------------------------------------------|
| Frontend             | Next.js 14 (App Router), Tailwind CSS, Monaco    |
| Auth                 | Clerk v7                                        |
| Real‑time collab     | yjs CRDT over a Cloudflare Worker WebSocket relay |
| Terminal             | xterm.js (COEP/COOP headers for SharedArrayBuffer) |
| Execution            | WebContainers API (browser)                      |
| Database             | Supabase Postgres via Drizzle ORM                |
| Payments             | Stripe                                           |
| Deployment           | Vercel (frontend), Cloudflare Workers (collab)   |

*(An earlier version of this README described Turso/libSQL, Codeium, ONNX Runtime,
and Fly.io Firecracker; those reflected the original design, not the current build.)*

## 🏁 Quick Start
```bash
git clone https://github.com/JaeTierce31/Sovereign-Development.git
cd Sovereign-Development
cp .env.example .env.local
# Fill in the required keys
npm install
npm run dev
```

The mobile layout is served automatically when you visit from a mobile device.

## 📄 License

Apache 2.0 – see LICENSE.  
Note: WebContainers API requires a separate commercial license for production use.

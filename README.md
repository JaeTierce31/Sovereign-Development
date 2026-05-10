# 🦅 Peregrine

> **Code at the speed of flight.**  
> The mobile‑first, edge‑native collaborative cloud IDE.

Peregrine lets you write, run, and deploy full‑stack apps from any device – phone, tablet, or desktop – with zero configuration. It combines a gesture‑driven mobile editor, instant in‑browser execution (WebContainers), real‑time collaboration, on‑device AI, and one‑click deployment to the global edge.

## 🚀 Try it now
**[peregrine.dev](https://peregrine.dev)** – works in your browser, no install required.  
For the full PWA experience: open on your phone, tap **Share → Add to Home Screen**.

## 📦 Tech Stack
| Layer                | Technology                                      |
|----------------------|-------------------------------------------------|
| Frontend             | Next.js 14 (App Router), Tailwind CSS, Monaco    |
| Real‑time sync       | Cloudflare Durable Objects, WebTransport, Abyo‑CRDT |
| Execution            | WebContainers API (browser) + Fly.io Firecracker |
| Database             | Turso / libSQL (distributed SQLite)             |
| AI                   | ONNX Runtime Web (WebGPU), Codeium API          |
| Payments             | Stripe via usebilling                           |
| Deployment           | Vercel (frontend), Cloudflare Workers (collab)   |
| User deployments     | Cloudflare Pages                                |

## 🏁 Quick Start
```bash
git clone https://github.com/jaetierce31/peregrine.ai.git
cd peregrine.ai
cp .env.example .env.local
# Fill in the required keys
npm install
npm run dev
```

The mobile layout is served automatically when you visit from a mobile device.

## 📄 License

Apache 2.0 – see LICENSE.  
Note: WebContainers API requires a separate commercial license for production use.

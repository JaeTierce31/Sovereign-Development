import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SignUpButton, SignInButton } from '@clerk/nextjs';

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard');

  return (
    <main className="min-h-screen bg-peregrine-dark flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-16 text-center">
        {/* Logo mark */}
        <div className="mb-8 relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/25">
            <span className="text-white text-3xl">🦅</span>
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 blur-xl -z-10" />
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-white tracking-tight mb-4">
          Peregrine
        </h1>
        <p className="text-xl text-blue-400 font-medium mb-3">
          Code at the speed of flight.
        </p>
        <p className="max-w-xl text-gray-400 text-base leading-relaxed mb-10">
          A mobile-first, edge-native collaborative cloud IDE. Write, run, and share
          code from any device — with AI assistance built in.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <SignUpButton mode="modal">
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/20">
              Start coding free →
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-medium rounded-xl transition-colors border border-gray-700">
              Sign in
            </button>
          </SignInButton>
        </div>
      </div>

      {/* Feature grid */}
      <div className="max-w-4xl mx-auto w-full px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: "⚡",
              title: "In-browser execution",
              desc: "Run Node.js, TypeScript, Python, and shell scripts directly in the browser — no server needed.",
            },
            {
              icon: "✦",
              title: "AI code assistant",
              desc: "Ask Peregrine AI anything about your code. Context-aware, streaming responses.",
            },
            {
              icon: "📱",
              title: "Mobile-first",
              desc: "Full editing experience on iPhone and Android. Custom keyboard row for common symbols.",
            },
            {
              icon: "🔗",
              title: "Instant sharing",
              desc: "One click to share your project as a read-only link. No sign-in required to view.",
            },
            {
              icon: "👥",
              title: "Real-time collab",
              desc: "Live cursors and conflict-free collaborative editing powered by CRDT sync.",
            },
            {
              icon: "🌐",
              title: "Edge-native",
              desc: "Deployed globally on Vercel Edge. Files sync via Cloudflare Workers.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl hover:border-gray-600 transition-colors"
            >
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="text-sm font-semibold text-white mb-1">{f.title}</div>
              <div className="text-xs text-gray-500 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-4 flex items-center justify-between text-xs text-gray-600">
        <span>© 2026 Peregrine</span>
        <div className="flex gap-4">
          <Link href="/sign-in" className="hover:text-gray-400 transition-colors">Sign in</Link>
          <Link href="/sign-up" className="hover:text-gray-400 transition-colors">Sign up</Link>
        </div>
      </footer>
    </main>
  );
}

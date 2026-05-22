"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Suspense } from "react";
import { getUserApiKey, setUserApiKey } from "@/lib/userApiKey";

interface BillingStatus {
  tier: string;
  email: string;
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const upgraded = searchParams.get("upgraded") === "true";

  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalPending, startPortal] = useTransition();
  const [checkoutPending, startCheckout] = useTransition();
  const [apiKey, setApiKey] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false));
    setApiKey(getUserApiKey());
  }, []);

  function saveApiKey(e: React.FormEvent) {
    e.preventDefault();
    setUserApiKey(apiKey);
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  }

  function clearApiKey() {
    setUserApiKey("");
    setApiKey("");
  }

  function openPortal() {
    startPortal(async () => {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    });
  }

  function startUpgrade() {
    startCheckout(async () => {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Unable to start checkout");
    });
  }

  const isPro = status?.tier === "pro";

  return (
    <div className="min-h-screen bg-peregrine-dark">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-10">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← Dashboard
          </button>
        </div>

        <h1 className="text-2xl font-semibold text-white mb-8">Settings</h1>

        {upgraded && (
          <div className="mb-6 px-4 py-3 bg-green-900/40 border border-green-700 rounded-lg text-green-400 text-sm">
            You&apos;re now on Peregrine Pro. Welcome aboard!
          </div>
        )}

        {/* Account */}
        <section className="mb-8 p-5 bg-gray-900 border border-gray-700 rounded-xl">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Account</h2>
          <div className="flex items-center gap-3">
            <UserButton />
            <div>
              <p className="text-white text-sm">{loading ? "…" : status?.email}</p>
              <p className="text-xs text-gray-500 capitalize mt-0.5">
                {loading ? "…" : `${status?.tier ?? "free"} plan`}
              </p>
            </div>
          </div>
        </section>

        {/* Billing */}
        <section className="p-5 bg-gray-900 border border-gray-700 rounded-xl">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Billing</h2>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : isPro ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Peregrine Pro</p>
                <p className="text-xs text-gray-500 mt-0.5">Full collaboration, unlimited projects</p>
              </div>
              <button
                onClick={openPortal}
                disabled={portalPending}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {portalPending ? "Opening…" : "Manage subscription"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Free plan</p>
                <p className="text-xs text-gray-500 mt-0.5">Upgrade to unlock real-time collab and more</p>
              </div>
              <button
                onClick={startUpgrade}
                disabled={checkoutPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {checkoutPending ? "Redirecting…" : "Upgrade to Pro"}
              </button>
            </div>
          )}
        </section>

        {/* AI */}
        <section className="mt-6 p-5 bg-gray-900 border border-gray-700 rounded-xl">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">AI Assistant</h2>
          <p className="text-xs text-gray-500 mb-4">
            Provide your own Anthropic API key to enable AI features. The key is stored only in your browser and sent directly to Anthropic — never stored on our servers.
          </p>

          <form onSubmit={saveApiKey} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Anthropic API Key</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-…"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 focus:border-blue-500 rounded-lg text-white text-sm font-mono focus:outline-none pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
                >
                  {apiKeySaved ? "✓ Saved" : "Save"}
                </button>
                {apiKey && (
                  <button
                    type="button"
                    onClick={clearApiKey}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {getUserApiKey() && (
              <div className="flex items-center gap-2 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                API key set — AI features are enabled
              </div>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

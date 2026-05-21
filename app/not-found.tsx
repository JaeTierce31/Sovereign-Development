import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-6">
        <span className="text-6xl font-bold text-gray-800">404</span>
      </div>
      <h1 className="text-white text-xl font-semibold mb-2">Page not found</h1>
      <p className="text-gray-500 text-sm mb-8 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
        >
          Home
        </Link>
      </div>
    </div>
  );
}

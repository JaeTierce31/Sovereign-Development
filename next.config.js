const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: { document: '/_offline.html' },
});

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@webcontainer/api'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // monaco-vim's UMD bundle requires monaco-editor at build time; at runtime
      // @monaco-editor/react exposes the editor instance as the global `monaco`.
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : config.externals ? [config.externals] : []),
        { 'monaco-editor/esm/vs/editor/editor.api': 'monaco' },
      ];
    }
    return config;
  },
  images: {
    domains: ['avatars.githubusercontent.com', 'img.clerk.com'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
});

module.exports = nextConfig;

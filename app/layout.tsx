import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ClerkProvider, SignInButton, SignUpButton, UserButton, Show } from '@clerk/nextjs';

export const viewport: Viewport = {
  themeColor: '#0F172A',
};

export const metadata: Metadata = {
  title: 'Peregrine',
  description: 'Code at the speed of flight.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Peregrine',
  },
  openGraph: {
    title: 'Peregrine',
    description: 'The mobile-first, edge-native collaborative cloud IDE.',
    url: 'https://peregrine.dev',
    siteName: 'Peregrine',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Peregrine',
    description: 'Code at the speed of flight.',
    creator: '@peregrine_dev',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Peregrine" />
        <link rel="icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-peregrine-dark text-white">
        <ClerkProvider>
          <header className="fixed top-0 right-0 z-50 flex items-center gap-2 p-3">
            <Show when="signed-out">
              <SignInButton mode="modal" />
              <SignUpButton mode="modal" />
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}

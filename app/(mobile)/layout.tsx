import { GestureProvider } from '@/lib/device';

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <GestureProvider>
      <div className="h-screen w-screen overflow-hidden bg-peregrine-dark">
        {children}
      </div>
    </GestureProvider>
  );
}

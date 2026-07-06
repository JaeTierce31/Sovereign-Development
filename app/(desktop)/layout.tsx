export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-peregrine-dark">
      {children}
    </div>
  );
}

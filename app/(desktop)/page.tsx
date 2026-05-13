import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard');

  return (
    <main className="min-h-screen bg-peregrine-dark flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl font-bold text-white mb-4">Peregrine</h1>
      <p className="text-xl text-gray-400 mb-8">Code at the speed of flight.</p>
      <p className="text-gray-500 text-sm">Sign in to access your projects.</p>
    </main>
  );
}

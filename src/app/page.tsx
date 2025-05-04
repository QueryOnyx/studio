'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the authentication page
    router.replace('/auth');
  }, [router]);

  // Optionally show a loading indicator while redirecting
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4">Redirecting to login...</p>
    </div>
  );
}

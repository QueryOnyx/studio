'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication status from localStorage
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

    if (isAuthenticated) {
      // If logged in, redirect to the lobby
      setRedirectTarget('/lobby');
    } else {
      // If not logged in, redirect to the auth page
      setRedirectTarget('/auth');
    }
  }, []); // Run only once on mount

  useEffect(() => {
    if (redirectTarget) {
      router.replace(redirectTarget);
      // Keep loading state true during redirection to avoid flashing content
      // setIsLoading(false); // Don't set to false immediately
    }
  }, [redirectTarget, router]);


  // Show a loading indicator while determining the redirect target and during redirection
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4">Loading...</p>
    </div>
  );
}

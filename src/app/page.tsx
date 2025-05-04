
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Use onAuthStateChanged to determine where to redirect
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If logged in, redirect to the lobby
        router.replace('/lobby');
      } else {
        // If not logged in, redirect to the auth page
        router.replace('/auth');
      }
      // Keep loading until the redirect actually happens or state is confirmed
      // setIsLoading(false); // Don't set false immediately, let redirect finish
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]); // Run only once on mount


  // Show a loading indicator while determining the redirect target and during redirection
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4">Loading...</p>
    </div>
  );
}

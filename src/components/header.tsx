
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User, LogOut, Users, Sword } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { onAuthStateChanged, signOut } from "firebase/auth"; // Import Firebase auth functions
import { auth } from "@/lib/firebase"; // Import Firebase auth instance
import type { User as FirebaseUser } from "firebase/auth"; // Import Firebase User type


export default function Header() {
  // Use FirebaseUser type or null
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Still useful for initial check
  const router = useRouter();
  const pathname = usePathname();

  // This effect runs only on the client after hydration
  useEffect(() => {
    setIsLoading(true);
    // Use Firebase's onAuthStateChanged listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // currentUser is null if not logged in
      setIsLoading(false); // Update loading state once auth state is known

      // Redirect logic based on auth state and current path
      if (currentUser) {
        // User is signed in
        if (pathname === '/' || pathname === '/auth') {
            // If logged in and on root or auth page, redirect to lobby
            router.replace('/lobby');
        }
      } else {
        // No user is signed in.
        if (pathname !== '/auth') {
            // If not logged in and not on auth page, redirect to auth
             router.replace('/auth');
        }
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
     // Only run on mount and unmount
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // Add router to dependencies


  const handleLogout = async () => {
     try {
         await signOut(auth); // Sign out using Firebase
         // setUser(null) will be handled by onAuthStateChanged
         router.push('/auth'); // Redirect to auth page on logout
     } catch (error) {
        console.error("Logout Error:", error);
        // Optionally show a toast message for logout failure
     }
  };

  // Function to determine if a link is active
  const isActive = (href: string) => pathname === href;

  // Determine authentication status based on user object
  const isAuthenticated = !!user;
  const username = user?.displayName || user?.email; // Use displayName or fallback to email

  return (
    <header className="bg-card text-card-foreground shadow-md sticky top-0 z-50">
      <nav className="container mx-auto flex items-center justify-between px-4 py-3">
         <Link href={isAuthenticated ? "/lobby" : "/auth"} className="text-xl font-bold text-primary hover:text-primary/90 transition-colors">
          Triad Trials <Sword className="inline h-5 w-5 ml-1" />
        </Link>
        <div className="flex items-center gap-2 md:gap-4">
          {/* Only render buttons after initial loading is false and user is authenticated */}
          {!isLoading && isAuthenticated && username ? (
            <>
              <Button
                variant={isActive('/lobby') ? 'secondary' : 'ghost'} // Active style
                size="sm"
                className={cn(
                   "border border-transparent rounded-md px-3 py-1", // Base styles
                   isActive('/lobby') ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent/50", // Active border and subtle background
                   "flex items-center gap-2" // Ensure icon and text are aligned
                 )}
                 asChild>
                <Link href="/lobby">
                  <Users /> <span className="hidden md:inline">Lobby</span>
                </Link>
              </Button>
              <Button
                 variant={isActive('/profile') ? 'secondary' : 'ghost'} // Active style
                 size="sm"
                 className={cn(
                    "border border-transparent rounded-md px-3 py-1", // Base styles
                    isActive('/profile') ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent/50", // Active border and subtle background
                    "flex items-center gap-2" // Ensure icon and text are aligned
                  )}
                 asChild>
                <Link href="/profile">
                  <User /> <span className="hidden md:inline truncate max-w-[100px]">{username}</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut /> <span className="hidden md:inline">Logout</span>
              </Button>
            </>
          ) : isLoading ? (
             <div className="h-9 w-48 animate-pulse bg-muted rounded-md"></div> // Placeholder while loading
          ) : null /* Render nothing if not loading and not authenticated */ }
        </div>
      </nav>
    </header>
  );
}

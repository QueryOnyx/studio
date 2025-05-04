'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User, LogOut, Users, Sword } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function Header() {
  // Initialize state to null/undefined to avoid hydration mismatch
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false); // Track if running on client
  const router = useRouter();
  const pathname = usePathname();

  // This effect runs only on the client after hydration
  useEffect(() => {
    setIsClient(true); // Component has mounted on the client

    // Check auth status from localStorage
    const storedAuth = localStorage.getItem('isAuthenticated');
    const storedUser = localStorage.getItem('username');

    if (storedAuth === 'true' && storedUser) {
      setIsAuthenticated(true);
      setUsername(storedUser);
      // If authenticated and currently on the root or auth page, redirect to lobby
      if (pathname === '/' || pathname === '/auth') {
        router.push('/lobby');
      }
    } else {
      setIsAuthenticated(false);
      setUsername(null);
      // If not authenticated and not already on auth page, redirect
      // Ensure we are not already on the auth page to prevent infinite loop
      if (pathname !== '/auth') {
        router.push('/auth');
      }
    }
  }, [pathname, router]); // Rerun if pathname or router changes


  const handleLogout = () => {
     // Simulate logout
     localStorage.removeItem('isAuthenticated');
     localStorage.removeItem('username');
     setIsAuthenticated(false);
     setUsername(null);
     router.push('/auth'); // Redirect to auth page on logout
  };

  // Function to determine if a link is active
  const isActive = (href: string) => pathname === href;

  return (
    <header className="bg-card text-card-foreground shadow-md sticky top-0 z-50">
      <nav className="container mx-auto flex items-center justify-between px-4 py-3">
         <Link href={isAuthenticated ? "/lobby" : "/auth"} className="text-xl font-bold text-primary hover:text-primary/90 transition-colors">
          Triad Trials <Sword className="inline h-5 w-5 ml-1" />
        </Link>
        <div className="flex items-center gap-2 md:gap-4">
          {/* Only render buttons after client-side check is complete and user is authenticated */}
          {isClient && isAuthenticated && username ? (
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
                  <User /> <span className="hidden md:inline">{username}</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut /> <span className="hidden md:inline">Logout</span>
              </Button>
            </>
          ) : null }
          {/* Optionally show a placeholder or nothing while loading client state */}
           {!isClient && <div className="h-9 w-32"></div>} {/* Placeholder to prevent layout shift */}
        </div>
      </nav>
    </header>
  );
}

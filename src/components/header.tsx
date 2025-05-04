'use client'; // Since we might use hooks for auth status later

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User, LogOut, Users, Sword } from 'lucide-react'; // Added Sword for game icon
import { useState, useEffect } from 'react'; // Placeholder for auth state
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname
import { cn } from '@/lib/utils'; // Import cn utility

export default function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname(); // Get the current path

  useEffect(() => {
    // Check auth status on mount/re-render if needed
    const storedAuth = localStorage.getItem('isAuthenticated');
    const storedUser = localStorage.getItem('username');

    if (storedAuth === 'true' && storedUser) {
      // User is authenticated
      setIsAuthenticated(true);
      setUsername(storedUser);

      // If authenticated and currently on the root or auth page, redirect to lobby
      if (pathname === '/' || pathname === '/auth') {
        router.push('/lobby');
      }
    } else {
      // User is not authenticated
      setIsAuthenticated(false);
      setUsername(null); // Clear username if not authenticated

      // If not authenticated and not already on auth page, redirect
      if (pathname !== '/auth') {
        router.push('/auth');
      }
    }
    // Dependency array ensures this runs when pathname changes, or on initial mount.
  }, [pathname, router]); // Run when path changes or router object is available


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
        {/* Keep the brand link */}
         <Link href={isAuthenticated ? "/lobby" : "/auth"} className="text-xl font-bold text-primary hover:text-primary/90 transition-colors">
          Triad Trials <Sword className="inline h-5 w-5 ml-1" />
        </Link>
        <div className="flex items-center gap-2 md:gap-4">
          {isAuthenticated && username ? ( // Only show if authenticated and username exists
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
        </div>
      </nav>
    </header>
  );
}

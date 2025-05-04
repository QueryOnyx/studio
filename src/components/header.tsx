'use client'; // Since we might use hooks for auth status later

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User, LogIn, LogOut, Users, Sword } from 'lucide-react'; // Added Sword for game icon
import { useState, useEffect } from 'react'; // Placeholder for auth state

export default function Header() {
  // Placeholder for authentication status. Replace with actual auth logic.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // Simulate checking auth status on mount
    // Replace with actual check (e.g., from localStorage, context, or server)
    const storedAuth = localStorage.getItem('isAuthenticated');
    const storedUser = localStorage.getItem('username');
    if (storedAuth === 'true' && storedUser) {
        setIsAuthenticated(true);
        setUsername(storedUser);
    }
  }, []);


  const handleLogout = () => {
     // Simulate logout
     localStorage.removeItem('isAuthenticated');
     localStorage.removeItem('username');
     setIsAuthenticated(false);
     setUsername(null);
     // Potentially redirect to home or login page
  };

  return (
    <header className="bg-secondary text-secondary-foreground shadow-md">
      <nav className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-primary hover:text-primary/90 transition-colors">
          Triad Trials <Sword className="inline h-5 w-5 ml-1" />
        </Link>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/lobby">
                  <Users className="mr-2 h-4 w-4" /> Lobby
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" /> {username || 'Profile'}
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </>
          ) : (
            <Button variant="default" size="sm" asChild>
              <Link href="/auth">
                <LogIn className="mr-2 h-4 w-4" /> Login / Sign Up
              </Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}

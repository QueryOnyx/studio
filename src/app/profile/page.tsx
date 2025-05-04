'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Mail, Edit, Save, XCircle, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";

// Placeholder User Data structure
interface UserProfile {
  username: string;
  email: string;
  joinDate: string; // Consider using Date object
  gamesPlayed: number;
  winRate: number; // Percentage
  avatarUrl?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    // Check authentication (simple example)
    const storedUsername = localStorage.getItem('username');
    if (localStorage.getItem('isAuthenticated') !== 'true' || !storedUsername) {
        toast({
            title: "Access Denied",
            description: "Please log in to view your profile.",
            variant: "destructive",
        });
        router.push('/auth');
        return; // Stop execution if not authenticated
    }


    // --- Placeholder for fetching user data from MongoDB ---
    // Replace with actual API call
    const fetchUserData = async (username: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      // Simulate fetching data based on storedUsername
      const mockUser: UserProfile = {
        username: username,
        email: `${username.toLowerCase()}@example.com`, // Mock email
        joinDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toLocaleDateString(), // Mock join date (1 week ago)
        gamesPlayed: 15,
        winRate: 60,
        avatarUrl: `https://i.pravatar.cc/150?u=${username}` // Placeholder avatar
      };
      setUser(mockUser);
      setEditedUsername(mockUser.username);
      setEditedEmail(mockUser.email);
      setIsLoading(false);
    };

    fetchUserData(storedUsername);
    // --- End Placeholder ---

  }, [router, toast]);

  const handleEditToggle = () => {
    if (isEditing && user) { // Reset fields if cancelling edit
        setEditedUsername(user.username);
        setEditedEmail(user.email);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
     if (!user) return;
     setIsLoading(true);

     // --- Placeholder for updating user data in MongoDB ---
     console.log("Saving profile:", { username: editedUsername, email: editedEmail });
     await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

     // Example success/failure
     const saveSuccess = editedUsername !== "fail"; // Simulate failure

     setIsLoading(false);

     if(saveSuccess) {
         setUser({ ...user, username: editedUsername, email: editedEmail });
         localStorage.setItem('username', editedUsername); // Update local storage if username changed
         setIsEditing(false);
         toast({ title: "Profile Updated", description: "Your changes have been saved." });
     } else {
         toast({ title: "Update Failed", description: "Could not save changes. Please try again.", variant: "destructive" });
     }
     // --- End Placeholder ---
  };

  if (isLoading && !user) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
     // This case should ideally be handled by the auth check redirecting,
     // but added as a fallback.
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
             <Card className="w-full max-w-md text-center">
                <CardHeader><CardTitle>Error</CardTitle></CardHeader>
                <CardContent><p>Could not load user profile. Please try logging in again.</p>
                 <Button onClick={() => router.push('/auth')} className="mt-4">Go to Login</Button>
                </CardContent>
             </Card>
        </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
       <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-center gap-4">
           <Avatar className="h-24 w-24 border-2 border-primary">
            <AvatarImage src={user.avatarUrl} alt={user.username} data-ai-hint="user avatar profile picture" />
            <AvatarFallback className="text-3xl bg-muted">
              {user.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left">
            {isEditing ? (
                <Input
                    className="text-3xl font-bold mb-1"
                    value={editedUsername}
                    onChange={(e) => setEditedUsername(e.target.value)}
                    disabled={isLoading}
                 />
            ) : (
                 <CardTitle className="text-3xl font-bold">{user.username}</CardTitle>
            )}
            {isEditing ? (
                 <Input
                    type="email"
                    className="text-muted-foreground"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    disabled={isLoading}
                 />
            ) : (
                 <CardDescription className="flex items-center gap-1 justify-center sm:justify-start">
                    <Mail className="h-4 w-4" /> {user.email}
                 </CardDescription>
            )}
             <CardDescription className="text-sm mt-1">Joined: {user.joinDate}</CardDescription>
          </div>
          <div>
             {isEditing ? (
                 <div className="flex gap-2 mt-2 sm:mt-0">
                    <Button size="sm" onClick={handleSave} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                    </Button>
                     <Button size="sm" variant="outline" onClick={handleEditToggle} disabled={isLoading}>
                        <XCircle className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                 </div>
             ) : (
                 <Button size="sm" variant="outline" onClick={handleEditToggle} disabled={isLoading}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Profile
                </Button>
             )}

          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t">
            <div className="flex flex-col items-center p-4 bg-secondary rounded-lg shadow-inner">
                <Label className="text-sm text-muted-foreground">Games Played</Label>
                <p className="text-2xl font-semibold">{user.gamesPlayed}</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-secondary rounded-lg shadow-inner">
                 <Label className="text-sm text-muted-foreground">Win Rate</Label>
                <p className="text-2xl font-semibold">{user.winRate}%</p>
            </div>
        </CardContent>
       </Card>

        {/* Placeholder for Game History */}
       <Card className="shadow-lg">
           <CardHeader>
               <CardTitle className="text-xl flex items-center gap-2"><History className="h-5 w-5 text-primary"/> Game History</CardTitle>
                <CardDescription>A record of your past trials.</CardDescription>
           </CardHeader>
            <CardContent className="text-center text-muted-foreground h-24 flex items-center justify-center">
                <p>(Game history will be displayed here)</p>
            </CardContent>
       </Card>

    </div>
  );
}

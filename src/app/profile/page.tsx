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
import { format } from 'date-fns'; // Import date-fns for formatting

// User Profile structure (matching backend potential fields)
interface UserProfile {
  _id: string; // MongoDB ID
  username: string;
  email: string;
  joinDate: string; // Assuming ISO string from backend
  gamesPlayed: number;
  winRate: number; // Percentage
  avatarUrl?: string; // Optional
  createdAt: string; // Assuming ISO string from backend
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Separate state for saving
  const [editedUsername, setEditedUsername] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    // Check authentication
    const storedUsername = localStorage.getItem('username');
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

    console.log("Profile Page Check:", { isAuthenticated, storedUsername }); // Debug log

    if (!isAuthenticated || !storedUsername) {
        console.log("Redirecting to /auth because check failed."); // Debug log
        toast({
            title: "Access Denied",
            description: "Please log in to view your profile.",
            variant: "destructive",
        });
        router.push('/auth');
        return;
    }

    // Fetch user data from API
    const fetchUserData = async (username: string) => {
      try {
        console.log(`Fetching data for user: ${username}`); // Debug log
        // Note: Using GET with username in query param. Adjust if API uses POST or different structure.
        const response = await fetch(`/api/user/${username}`); // Adjust API endpoint if needed
        const data = await response.json();

        if (response.ok) {
           console.log("User data fetched:", data.user); // Debug log
           // Format the joinDate before setting state
          const formattedJoinDate = data.user.joinDate
            ? format(new Date(data.user.joinDate), 'PPP') // 'PPP' gives format like "Jun 20th, 2023"
            : 'N/A';

          const profileData = {
              ...data.user,
              joinDate: formattedJoinDate, // Use the formatted date
              // Ensure necessary fields exist, provide defaults if missing
              gamesPlayed: data.user.gamesPlayed ?? 0,
              winRate: data.user.winRate ?? 0,
              avatarUrl: data.user.avatarUrl || `https://i.pravatar.cc/150?u=${username}` // Placeholder if no avatar
          };

          setUser(profileData);
          setEditedUsername(profileData.username);
          setEditedEmail(profileData.email);
        } else {
           console.error("API Error fetching profile:", data.message); // Debug log
          throw new Error(data.message || 'Failed to fetch profile data');
        }
      } catch (error: any) {
        console.error("Fetch User Data Error:", error);
        toast({
          title: "Error Loading Profile",
          description: error.message || "Could not retrieve your profile information.",
          variant: "destructive",
        });
         // Optionally redirect or show error state
         // setUser(null); // Clear user state on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData(storedUsername);

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
     setIsSaving(true); // Use separate loading state for save action

     try {
         const response = await fetch(`/api/user/${user.username}`, { // Use original username in URL
            method: 'PUT', // Or PATCH
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: editedUsername, email: editedEmail }),
         });

         const data = await response.json();

         if(response.ok) {
             // Update local state with potentially updated data from API response
             const updatedUser = {
                ...user,
                ...data.user, // Get updated fields from response
                joinDate: user.joinDate // Keep the originally formatted joinDate
             };
             setUser(updatedUser);
             setEditedUsername(updatedUser.username); // Update edit fields too
             setEditedEmail(updatedUser.email);
             localStorage.setItem('username', updatedUser.username); // Update local storage if username changed
             setIsEditing(false);
             toast({ title: "Profile Updated", description: "Your changes have been saved." });
         } else {
            throw new Error(data.message || 'Failed to update profile');
         }
     } catch (error: any) {
         console.error("Save Profile Error:", error);
         toast({ title: "Update Failed", description: error.message || "Could not save changes. Please try again.", variant: "destructive" });
     } finally {
        setIsSaving(false); // End saving loading state
     }
  };

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // --- Error or No User State ---
  if (!user) {
    // Avoid showing error briefly if just redirecting
    // The redirect logic in useEffect handles the unauthorized case
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
          {/* Keep loader or blank while redirecting */}
           <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  // --- Profile Display ---
  return (
    <div className="max-w-3xl mx-auto space-y-6">
       <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-center gap-4 border-b pb-4">
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
                    disabled={isSaving}
                    aria-label="Edit Username"
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
                    disabled={isSaving}
                    aria-label="Edit Email"
                 />
            ) : (
                 <CardDescription className="flex items-center gap-1 justify-center sm:justify-start text-muted-foreground">
                    <Mail className="h-4 w-4" /> {user.email}
                 </CardDescription>
            )}
             <CardDescription className="text-sm mt-1 text-muted-foreground">Joined: {user.joinDate}</CardDescription>
          </div>
          <div className="flex-shrink-0">
             {isEditing ? (
                 <div className="flex gap-2 mt-2 sm:mt-0">
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                    </Button>
                     <Button size="sm" variant="outline" onClick={handleEditToggle} disabled={isSaving}>
                        <XCircle className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                 </div>
             ) : (
                 <Button size="sm" variant="outline" onClick={handleEditToggle} disabled={isSaving}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Profile
                </Button>
             )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
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
            <CardContent className="text-center text-muted-foreground h-24 flex items-center justify-center border rounded-lg">
                <p>(Game history feature coming soon)</p>
            </CardContent>
       </Card>

    </div>
  );
}


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
import { format } from 'date-fns';
import { onAuthStateChanged, updateProfile, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase"; // Import Firebase instances
import type { User as FirebaseUser } from "firebase/auth";

// User Profile structure (matching Firestore)
interface UserProfile {
  uid: string; // Firebase UID
  username: string;
  email: string;
  joinDate: string; // Formatted string
  gamesPlayed: number;
  winRate: number; // Percentage
  avatarUrl?: string; // Optional
  createdAt?: Timestamp; // Firestore Timestamp
}

export default function ProfilePage() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        // Fetch Firestore profile data
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            // Format the joinDate (assuming it's a Firestore Timestamp)
            const formattedJoinDate = data.joinDate instanceof Timestamp
              ? format(data.joinDate.toDate(), 'PPP') // 'PPP' gives format like "Jun 20th, 2023"
              : 'N/A';

            const profileData: UserProfile = {
              uid: user.uid,
              username: data.username || user.displayName || 'User', // Fallback
              email: data.email || user.email || 'No Email', // Fallback
              joinDate: formattedJoinDate,
              gamesPlayed: data.gamesPlayed ?? 0,
              winRate: data.winRate ?? 0,
              avatarUrl: data.avatarUrl || user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`, // Placeholder
              createdAt: data.createdAt,
            };
            setUserProfile(profileData);
            setEditedUsername(profileData.username);
            setEditedEmail(profileData.email);
          } else {
            console.warn("No profile document found for user:", user.uid);
            // Create a basic profile if needed, or handle as an error
             toast({ title: "Profile Incomplete", description: "Could not find detailed profile data.", variant:"destructive" });
             // Use auth data as fallback
              const profileData: UserProfile = {
                 uid: user.uid,
                 username: user.displayName || 'User',
                 email: user.email || 'No Email',
                 joinDate: user.metadata.creationTime ? format(new Date(user.metadata.creationTime), 'PPP') : 'N/A',
                 gamesPlayed: 0,
                 winRate: 0,
                 avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
             };
             setUserProfile(profileData);
             setEditedUsername(profileData.username);
             setEditedEmail(profileData.email);
          }
        } catch (error) {
          console.error("Error fetching Firestore profile:", error);
          toast({
            title: "Error Loading Profile",
            description: "Could not retrieve your profile information.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        // No user is signed in.
        setFirebaseUser(null);
        setUserProfile(null);
        toast({
          title: "Access Denied",
          description: "Please log in to view your profile.",
          variant: "destructive",
        });
        router.push('/auth');
        // No need to setIsLoading(false) here as redirect happens
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router, toast]); // Depend on router and toast

  const handleEditToggle = () => {
    if (isEditing && userProfile) { // Reset fields if cancelling edit
        setEditedUsername(userProfile.username);
        setEditedEmail(userProfile.email);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!firebaseUser || !userProfile) return;
    setIsSaving(true);

    const updates: Record<string, any> = {};
    let authUpdates: Promise<void>[] = [];

    // --- Username Update ---
    if (editedUsername !== userProfile.username && editedUsername.trim()) {
      updates.username = editedUsername.trim();
      // Update Firebase Auth display name
      authUpdates.push(updateProfile(firebaseUser, { displayName: editedUsername.trim() }));
    }

    // --- Email Update (Requires Re-authentication usually) ---
    if (editedEmail !== userProfile.email && editedEmail.trim()) {
      // !! IMPORTANT: Updating email in Firebase Auth is sensitive and often requires re-authentication.
      // This example attempts it directly, but you might need a modal to ask for the password.
      updates.email = editedEmail.trim();
      // Prompt for password and re-authenticate before updating email
      const password = prompt("For security, please re-enter your password to change your email:");
      if (password && firebaseUser.email) {
          try {
              const credential = EmailAuthProvider.credential(firebaseUser.email, password);
              await reauthenticateWithCredential(firebaseUser, credential);
              // Re-authentication successful, now update email
              authUpdates.push(updateEmail(firebaseUser, editedEmail.trim()));
          } catch (reauthError: any) {
              console.error("Re-authentication failed:", reauthError);
              toast({ title: "Update Failed", description: `Could not verify your password. Email not changed. (${reauthError.message})`, variant: "destructive" });
              setIsSaving(false);
              return; // Stop the save process if re-auth fails
          }
      } else if(!password) {
           toast({ title: "Update Skipped", description: "Password not entered. Email not changed.", variant: "default" });
           // Remove email from Firestore updates if password wasn't entered
           delete updates.email;
      } else {
           // Should not happen if user is logged in via email/password
           toast({ title: "Update Error", description: "Cannot re-authenticate for email change.", variant: "destructive" });
           delete updates.email;
      }
    }

    try {
      // Perform Auth updates first
      await Promise.all(authUpdates);

      // Perform Firestore update if there are changes
      if (Object.keys(updates).length > 0) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        await updateDoc(userDocRef, updates);
      }

      // Update local state with the changes
      setUserProfile((prev) => prev ? { ...prev, ...updates, joinDate: prev.joinDate } : null); // Keep original joinDate format

      setIsEditing(false);
      toast({ title: "Profile Updated", description: "Your changes have been saved." });

    } catch (error: any) {
      console.error("Save Profile Error:", error);
      let errorDesc = "Could not save changes. Please try again.";
      if (error.code === 'auth/requires-recent-login') {
          errorDesc = "Changing sensitive data requires a recent login. Please log out and log back in.";
      } else if (error.code === 'auth/email-already-in-use') {
          errorDesc = "The new email address is already in use by another account.";
          form.setError("email", { type: "manual", message: errorDesc }); // If using react-hook-form
      } else if (error.code === 'auth/invalid-email') {
          errorDesc = "The new email address is invalid.";
           form.setError("email", { type: "manual", message: errorDesc }); // If using react-hook-form
      }
      toast({ title: "Update Failed", description: `${errorDesc} (${error.message || error.code})`, variant: "destructive" });
    } finally {
      setIsSaving(false);
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
   // If loading is finished but there's no user profile (either not found or error occurred)
   if (!userProfile) {
      // The useEffect already handles redirecting if not authenticated.
      // This state might be reached if authenticated but Firestore fetch failed.
      return (
          <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
              <Card className="w-full max-w-md text-center">
                  <CardHeader><CardTitle>Error</CardTitle></CardHeader>
                  <CardContent>
                      <p className="text-destructive">Could not load profile data.</p>
                      <Button onClick={() => router.push('/lobby')} className="mt-4">Back to Lobby</Button>
                  </CardContent>
              </Card>
          </div>
      );
   }


  // --- Profile Display ---
  return (
    <div className="max-w-3xl mx-auto space-y-6">
       <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-center gap-4 border-b pb-4">
           <Avatar className="h-24 w-24 border-2 border-primary">
            <AvatarImage src={userProfile.avatarUrl} alt={userProfile.username} data-ai-hint="user avatar profile picture" />
            <AvatarFallback className="text-3xl bg-muted">
              {userProfile.username.substring(0, 2).toUpperCase()}
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
                 <CardTitle className="text-3xl font-bold">{userProfile.username}</CardTitle>
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
                    <Mail className="h-4 w-4" /> {userProfile.email}
                 </CardDescription>
            )}
             <CardDescription className="text-sm mt-1 text-muted-foreground">Joined: {userProfile.joinDate}</CardDescription>
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
                <p className="text-2xl font-semibold">{userProfile.gamesPlayed}</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-secondary rounded-lg shadow-inner">
                 <Label className="text-sm text-muted-foreground">Win Rate</Label>
                <p className="text-2xl font-semibold">{userProfile.winRate}%</p>
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
                 {/* TODO: Fetch game history from Firestore based on userProfile.uid */}
            </CardContent>
       </Card>

    </div>
  );
}

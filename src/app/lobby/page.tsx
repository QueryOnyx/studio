
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Search, UserPlus, Loader2, List } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit } from "firebase/firestore"; // Import Firestore functions
import { db } from "@/lib/firebase"; // Import Firebase db instance
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Define interface for Game objects (matching Firestore structure)
interface Game {
  id: string; // Firestore document ID
  name: string;
  players: string[]; // Store player UIDs
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished'; // Added 'finished' status
  judgeType: 'human' | 'ai';
  createdAt: any; // Use 'any' for Timestamp or ServerTimestamp
  judgeId?: string; // Optional UID of the human judge
}

export default function LobbyPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterJudge, setFilterJudge] = useState('all');
  const router = useRouter();
  const { toast } = useToast();
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);


  // Listener for Auth State
   useEffect(() => {
       const unsubscribe = onAuthStateChanged(auth, (user) => {
           if (user) {
               setCurrentUserUid(user.uid);
           } else {
               setCurrentUserUid(null);
               // Redirect handled by Header/Root page, but double-check if needed
               // router.push('/auth');
           }
       });
       return () => unsubscribe();
   }, []);


  // Fetch Games from Firestore
  useEffect(() => {
    const fetchGames = async () => {
      setIsLoading(true);
      try {
        const gamesCollection = collection(db, "games");
        // Query for games that are not finished
        const q = query(gamesCollection, where("status", "!=", "finished"));
        const querySnapshot = await getDocs(q);
        const gamesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Game[];
        setGames(gamesData);
      } catch (error) {
        console.error("Error fetching games: ", error);
        toast({
          title: "Error",
          description: "Could not fetch available games.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGames();
    // Consider adding a real-time listener later using onSnapshot
  }, [toast]);


  const handleJoinGame = async (gameId: string) => {
    if (!currentUserUid) {
        toast({ title: "Error", description: "You must be logged in to join.", variant: "destructive"});
        return;
    }
    const game = games.find(g => g.id === gameId);
    if (game && game.players.length < game.maxPlayers && game.status === 'waiting') {
        setIsLoading(true);
        try {
            // TODO: Add logic to actually add the player to the game document in Firestore
            // This will likely involve updating the 'players' array.
            // Need a Cloud Function or more complex client-side logic to handle this atomically.
            // For now, just navigate.
            console.log(`Joining game ${gameId} - Firestore update needed`);
             // --- Placeholder: Add player UID to game in Firestore ---
             // const gameDocRef = doc(db, "games", gameId);
             // await updateDoc(gameDocRef, {
             //    players: arrayUnion(currentUserUid) // Add current user UID
             // });
             // --- End Placeholder ---

            toast({
                title: "Joining Game...",
                description: `Connecting to ${game.name}.`,
            });
            router.push(`/game/${gameId}`);
        } catch (error) {
            console.error("Error joining game:", error);
            toast({ title: "Join Failed", description: "Could not join the game.", variant: "destructive"});
            setIsLoading(false);
        }
    } else {
       toast({
        title: "Cannot Join Game",
        description: "This game is full or already in progress.",
        variant: "destructive",
      });
    }
  };

  const handleCreateGame = async () => {
     if (!currentUserUid) {
         toast({ title: "Error", description: "You must be logged in to create.", variant: "destructive"});
         return;
     }
     setIsLoading(true);
     try {
        const gamesCollection = collection(db, "games");
        const newGameData: Omit<Game, 'id'> = { // Omit 'id' as Firestore generates it
            name: `Trial ${Math.random().toString(36).substring(2, 6)}`, // Random name
            players: [currentUserUid], // Start with the creator
            maxPlayers: 3,
            status: 'waiting',
            judgeType: 'human', // Default to human judge for now
            createdAt: serverTimestamp(),
            judgeId: currentUserUid, // Creator is the judge initially
        };
        const docRef = await addDoc(gamesCollection, newGameData);
        toast({
            title: "Game Created",
            description: "Redirecting to your new game...",
        });
        router.push(`/game/${docRef.id}?new=true`); // Use the new document ID
     } catch (error) {
         console.error("Error creating game:", error);
         toast({ title: "Creation Failed", description: "Could not create the game.", variant: "destructive"});
          setIsLoading(false);
     }
  };

   const handleFindMatch = async () => {
     if (!currentUserUid) {
         toast({ title: "Error", description: "You must be logged in.", variant: "destructive"});
         return;
     }
     setIsLoading(true);
     toast({ title: "Searching for Match...", description: "Looking for available games..." });

     try {
         const gamesCollection = collection(db, "games");
         // Query for waiting games with space, not created by the current user
         const q = query(
             gamesCollection,
             where("status", "==", "waiting"),
             where("players", "!=", null), // Ensure players array exists
              // Firestore doesn't directly support "array length < maxPlayers" or "array not contains UID" in a single query easily.
              // Fetch candidates and filter client-side, or use a Cloud Function.
              limit(10) // Get a few candidates
            );

         const querySnapshot = await getDocs(q);
         let foundGame: Game | null = null;

         for (const doc of querySnapshot.docs) {
            const game = { id: doc.id, ...doc.data() } as Game;
             // Check if game has space AND current user is not already in it
            if (game.players.length < game.maxPlayers && !game.players.includes(currentUserUid)) {
                foundGame = game;
                break; // Found a suitable game
            }
         }


        if (foundGame) {
           // Join the found game (similar logic to handleJoinGame)
            console.log(`Joining game ${foundGame.id} via matchmaking - Firestore update needed`);
             // --- Placeholder: Add player UID to game in Firestore ---
             // const gameDocRef = doc(db, "games", foundGame.id);
             // await updateDoc(gameDocRef, {
             //    players: arrayUnion(currentUserUid)
             // });
             // --- End Placeholder ---
           toast({ title: "Match Found!", description: `Joining game ${foundGame.name}...` });
           router.push(`/game/${foundGame.id}`);
        } else {
            toast({ title: "No Match Found", description: "No suitable games available. Try creating one!", variant: "default" });
             setIsLoading(false);
        }
     } catch (error) {
        console.error("Error finding match:", error);
        toast({ title: "Matchmaking Failed", description: "Could not search for games.", variant: "destructive"});
         setIsLoading(false);
     }
   };

  const filteredGames = games.filter(game =>
    game.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterStatus === 'all' || game.status === filterStatus) &&
    (filterJudge === 'all' || game.judgeType === filterJudge)
  );

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
                <List className="h-6 w-6 text-primary" /> Game Lobby
            </CardTitle>
            <CardDescription>Join an existing game or create your own trial.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
            <Button onClick={handleCreateGame} disabled={isLoading || !currentUserUid} className="flex-1">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Create Game
            </Button>
            <Button onClick={handleFindMatch} variant="secondary" disabled={isLoading || !currentUserUid} className="flex-1">
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Find Match
            </Button>
          </CardContent>
      </Card>

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Available Games</CardTitle>
           <div className="flex flex-col md:flex-row gap-2 pt-2">
             <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search games..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={isLoading}
                />
             </div>
                <Select value={filterStatus} onValueChange={setFilterStatus} disabled={isLoading}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="waiting">Waiting</SelectItem>
                        <SelectItem value="playing">Playing</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={filterJudge} onValueChange={setFilterJudge} disabled={isLoading}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Filter by Judge" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Judges</SelectItem>
                        <SelectItem value="human">Human Judge</SelectItem>
                        <SelectItem value="ai">AI Judge</SelectItem>
                    </SelectContent>
                </Select>
           </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Players</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Judge</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGames.length > 0 ? (
                 filteredGames.map((game) => (
                <TableRow key={game.id}>
                  <TableCell className="font-medium">{game.name}</TableCell>
                  <TableCell>{game.players?.length || 0}/{game.maxPlayers}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${game.status === 'waiting' ? 'bg-green-700 text-green-100' : game.status === 'playing' ? 'bg-yellow-700 text-yellow-100' : 'bg-red-700 text-red-100'}`}>
                        {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                    </span>
                  </TableCell>
                   <TableCell>{game.judgeType === 'human' ? 'Human' : 'AI'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleJoinGame(game.id)}
                      disabled={game.status !== 'waiting' || (game.players?.length || 0) >= game.maxPlayers || isLoading || !currentUserUid || game.players?.includes(currentUserUid)}
                      title={game.players?.includes(currentUserUid || '') ? "You are already in this game" : ""}
                    >
                      Join
                    </Button>
                  </TableCell>
                </TableRow>
              ))
              ) : (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        No games match your criteria.
                    </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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

// Define interface for Game objects
interface Game {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  status: 'waiting' | 'playing';
  judgeType: 'human' | 'ai';
}

// Placeholder data - replace with actual data fetching from MongoDB
const initialGames: Game[] = [
  { id: 'g1', name: 'Beginner Banter', players: 2, maxPlayers: 3, status: 'waiting', judgeType: 'human' },
  { id: 'g2', name: 'AI Arena', players: 1, maxPlayers: 3, status: 'waiting', judgeType: 'ai' },
  { id: 'g3', name: 'Pro Players', players: 3, maxPlayers: 3, status: 'playing', judgeType: 'human' },
  { id: 'g4', name: 'Casual Chat', players: 0, maxPlayers: 3, status: 'waiting', judgeType: 'ai' },
];

export default function LobbyPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterJudge, setFilterJudge] = useState('all');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Simulate fetching data
    setIsLoading(true);
    // --- Placeholder for MongoDB Fetch ---
    // Replace with actual API call to fetch games
    const fetchGames = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      setGames(initialGames);
      setIsLoading(false);
    };
    fetchGames();
    // --- End Placeholder ---

    // Check authentication (simple example)
    if (localStorage.getItem('isAuthenticated') !== 'true') {
        toast({
            title: "Access Denied",
            description: "Please log in to access the lobby.",
            variant: "destructive",
        });
        router.push('/auth');
    }

  }, [router, toast]);


  const handleJoinGame = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (game && game.players < game.maxPlayers && game.status === 'waiting') {
       setIsLoading(true); // Show loading state
        // --- Placeholder for joining game logic ---
        console.log(`Attempting to join game ${gameId}`);
         setTimeout(() => { // Simulate API call
            toast({
                title: "Joining Game...",
                description: `Connecting to ${game.name}.`,
            });
            router.push(`/game/${gameId}`); // Navigate to game page
            // No need to setLoading(false) as navigation occurs
        }, 500);
       // --- End Placeholder ---
    } else {
       toast({
        title: "Cannot Join Game",
        description: "This game is full or already in progress.",
        variant: "destructive",
      });
    }
  };

  const handleCreateGame = () => {
     setIsLoading(true);
     // --- Placeholder for creating game logic ---
     console.log("Attempting to create game");
      setTimeout(() => { // Simulate API call
          const newGameId = `g${Date.now()}`; // Simple unique ID generation
          toast({
              title: "Game Created",
              description: "Redirecting to your new game...",
          });
          router.push(`/game/${newGameId}?new=true`); // Navigate to new game page
          // No need to setLoading(false) as navigation occurs
      }, 500);
     // --- End Placeholder ---
  };

   const handleFindMatch = () => {
     setIsLoading(true);
     toast({ title: "Searching for Match...", description: "Looking for available players..." });
     // --- Placeholder for matchmaking logic ---
     console.log("Attempting to find match");
     setTimeout(() => { // Simulate API call
        const availableGame = games.find(g => g.status === 'waiting' && g.players < g.maxPlayers);
        setIsLoading(false);
        if (availableGame) {
           toast({ title: "Match Found!", description: `Joining game ${availableGame.name}...` });
           router.push(`/game/${availableGame.id}`);
        } else {
            toast({ title: "No Match Found", description: "No suitable games available. Try creating one!", variant: "destructive" });
        }
     }, 1500);
     // --- End Placeholder ---
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
            <Button onClick={handleCreateGame} disabled={isLoading} className="flex-1">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Create Game
            </Button>
            <Button onClick={handleFindMatch} variant="secondary" disabled={isLoading} className="flex-1">
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
                  <TableCell>{game.players}/{game.maxPlayers}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${game.status === 'waiting' ? 'bg-green-700 text-green-100' : 'bg-yellow-700 text-yellow-100'}`}>
                        {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                    </span>
                  </TableCell>
                   <TableCell>{game.judgeType === 'human' ? 'Human' : 'AI'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleJoinGame(game.id)}
                      disabled={game.status !== 'waiting' || game.players >= game.maxPlayers || isLoading}
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


'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Send, Crown, Users, BrainCircuit, UserCheck, HelpCircle, LogOut } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { generateSubject } from '@/ai/flows/ai-subject-generation';
import { evaluateAccuracy } from '@/ai/flows/ai-accuracy-evaluation';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, addDoc, serverTimestamp, Timestamp, query, orderBy, limit, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';

// --- Types ---
type PlayerRole = 'judge' | 'player1' | 'player2' | 'spectator';
type GamePhase = 'waiting' | 'subject-selection' | 'discussion' | 'answering' | 'evaluation' | 'finished';

// Represents player data stored within the game document or potentially linked
interface Player {
  uid: string; // Firebase UID
  username: string; // Denormalized username
  role: PlayerRole;
  avatarUrl?: string; // Denormalized avatar URL
  // isReady? : boolean; // Might not be needed if using Firestore presence
}

// Represents the structure of the game document in Firestore
interface GameState {
  id: string; // Firestore document ID
  name: string;
  players: Player[]; // Array of player objects
  currentRound: number;
  maxRounds: number;
  phase: GamePhase;
  judgeType: 'human' | 'ai';
  judgeId?: string; // UID of the human judge
  currentSubject: string | null;
  currentAnswer: string | null;
  scores: Record<string, number>; // Player UID to score
  evaluationResult?: { score: number; justification: string };
  createdAt: Timestamp; // Firestore Timestamp
  lastUpdated: Timestamp | null;
}

// Represents the structure of a message document in the 'messages' subcollection
interface Message {
  id: string; // Firestore document ID
  senderUid: string; // UID of the sender ('system' or 'ai-judge' for special messages)
  senderUsername: string; // Denormalized username or 'System'/'AI Judge'
  text: string;
  timestamp: Timestamp | null; // Firestore Timestamp
}


// --- Component ---

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);


  const gameId = params.gameId as string;
  const isNewGame = searchParams.get('new') === 'true';

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ username: string; avatarUrl?: string } | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAiEvaluating, setIsAiEvaluating] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);


  const currentUserRole = gameState?.players.find(p => p.uid === currentUser?.uid)?.role;
  const isJudge = currentUserRole === 'judge';
  const isPlayer = currentUserRole === 'player1' || currentUserRole === 'player2';
  const judgePlayer = gameState?.players.find(p => p.role === 'judge');

  // --- Effects ---

   // Auth State Listener & Profile Fetch
   useEffect(() => {
       const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
           if (user) {
               setCurrentUser(user);
               // Fetch user profile for username/avatar
               try {
                   const userDocRef = doc(db, "users", user.uid);
                   const userDocSnap = await getDoc(userDocRef);
                   if (userDocSnap.exists()) {
                       const data = userDocSnap.data();
                       setCurrentUserProfile({
                           username: data.username || user.displayName || `User_${user.uid.substring(0, 4)}`,
                           avatarUrl: data.avatarUrl || user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`
                       });
                   } else {
                        // Handle case where profile might not exist yet
                        setCurrentUserProfile({ username: user.displayName || `User_${user.uid.substring(0, 4)}`, avatarUrl: `https://i.pravatar.cc/150?u=${user.uid}` });
                   }
               } catch (profileError) {
                   console.error("Error fetching user profile:", profileError);
                   // Use fallback profile
                   setCurrentUserProfile({ username: user.displayName || `User_${user.uid.substring(0, 4)}`, avatarUrl: `https://i.pravatar.cc/150?u=${user.uid}` });
                   toast({title: "Warning", description: "Could not load full profile details.", variant:"default"})
               }
           } else {
               setCurrentUser(null);
               setCurrentUserProfile(null);
               toast({ title: "Access Denied", description: "Please log in.", variant: "destructive" });
               router.push('/auth');
           }
       });
       return () => unsubscribeAuth();
   }, [router, toast]);


   // Game State Listener
    useEffect(() => {
        if (!gameId || !currentUser || !currentUserProfile) {
            setIsLoading(currentUser === null || currentUserProfile === null); // Keep loading if user data isn't ready
            return; // Don't proceed without gameId and user info
        }

        setIsLoading(true);
        setError(null);
        console.log(`Setting up listener for game: ${gameId}`);

        const gameDocRef = doc(db, "games", gameId);

        const unsubscribeGame = onSnapshot(gameDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                let loadedState = { id: docSnap.id, ...docSnap.data() } as GameState;

                // --- Handle Joining/Role Assignment ---
                const playerIndex = loadedState.players.findIndex(p => p.uid === currentUser.uid);
                let playerNeedsAdding = playerIndex === -1;
                let shouldUpdateFirestore = false;
                let systemMessage = '';

                if (playerNeedsAdding && loadedState.status === 'waiting' && loadedState.players.length < loadedState.maxPlayers) {
                    const newPlayer: Player = {
                        uid: currentUser.uid,
                        username: currentUserProfile.username,
                        avatarUrl: currentUserProfile.avatarUrl,
                        role: 'spectator', // Start as spectator, assign role below
                    };

                    const judgeExists = loadedState.players.some(p => p.role === 'judge');
                    const player1Exists = loadedState.players.some(p => p.role === 'player1');

                    if (loadedState.judgeType === 'human' && !judgeExists) {
                        newPlayer.role = 'judge';
                        loadedState.judgeId = currentUser.uid; // Assign judgeId
                        systemMessage = `${newPlayer.username} joined as the Judge.`;
                    } else if (!player1Exists) {
                        newPlayer.role = 'player1';
                         systemMessage = `${newPlayer.username} joined as Player 1.`;
                    } else {
                        newPlayer.role = 'player2';
                         systemMessage = `${newPlayer.username} joined as Player 2.`;
                    }

                    loadedState.players.push(newPlayer);
                    shouldUpdateFirestore = true;
                     console.log("Adding player:", newPlayer);
                }

                // --- Handle Game Start ---
                if (loadedState.players.length === loadedState.maxPlayers && loadedState.phase === 'waiting') {
                    loadedState.phase = 'subject-selection';
                    loadedState.currentRound = 1;
                    loadedState.currentSubject = null; // Ensure subject is cleared
                    loadedState.currentAnswer = null; // Ensure answer is cleared
                    loadedState.evaluationResult = undefined; // Ensure evaluation is cleared
                     systemMessage = systemMessage ? `${systemMessage} Game starting! Round 1 begins.` : `Game starting! Round 1 begins. Waiting for the subject.`;
                    shouldUpdateFirestore = true;
                    console.log("Starting game, round 1");
                }

                setGameState(loadedState);

                // Perform Firestore update if needed AFTER setting local state to avoid race conditions
                if (shouldUpdateFirestore) {
                    try {
                        await updateDoc(gameDocRef, {
                            players: loadedState.players,
                            phase: loadedState.phase,
                            currentRound: loadedState.currentRound,
                            judgeId: loadedState.judgeId, // Update judgeId if assigned
                            lastUpdated: serverTimestamp(),
                             // Clear these fields on round start
                            ...(loadedState.phase === 'subject-selection' && {
                                currentSubject: null,
                                currentAnswer: null,
                                evaluationResult: null, // Use null in Firestore
                            }),
                        });
                        if (systemMessage) {
                             await addSystemMessage(gameId, systemMessage);
                        }
                    } catch (updateError) {
                        console.error("Error updating game state:", updateError);
                         toast({title: "Error", description: "Failed to update game state.", variant: "destructive"});
                         // Potentially revert local state or handle error
                    }
                }

            } else {
                setError(`Game with ID "${gameId}" not found.`);
                setGameState(null);
                toast({ title: "Error", description: "Game not found.", variant: "destructive" });
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error listening to game state:", error);
            setError("Failed to load game data due to a connection issue.");
            setIsLoading(false);
            toast({ title: "Error", description: "Failed to sync game state.", variant: "destructive" });
        });


        // --- Messages Listener ---
        const messagesColRef = collection(db, "games", gameId, "messages");
        const qMessages = query(messagesColRef, orderBy("timestamp", "asc"), limit(100)); // Get latest 100

        const unsubscribeMessages = onSnapshot(qMessages, (querySnapshot) => {
            const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
            setMessages(msgs);
        }, (error) => {
             console.error("Error listening to messages:", error);
             toast({ title: "Error", description: "Failed to load chat messages.", variant: "destructive" });
        });


        return () => {
            console.log("Unsubscribing from game and messages listeners");
            unsubscribeGame();
            unsubscribeMessages();
        };

    }, [gameId, currentUser, currentUserProfile, router, toast]); // Add currentUserProfile dependency


    // Scroll to bottom when new messages arrive
    useEffect(() => {
       if (scrollAreaRef.current) {
          // Simple scroll to bottom - consider more nuanced approaches if needed
          // Use `scrollHeight` to scroll all the way down
           const scrollElement = scrollAreaRef.current.querySelector('div[style*="position: relative;"]'); // Adjust selector based on ScrollArea implementation details
           if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
           }
        }
    }, [messages]); // Run when messages change


  // --- Actions ---

    // Helper to add system messages to the subcollection
    const addSystemMessage = async (gameId: string, text: string): Promise<void> => {
         if (!text) return;
         try {
            const messagesColRef = collection(db, "games", gameId, "messages");
            await addDoc(messagesColRef, {
                senderUid: 'system',
                senderUsername: 'System',
                text: text,
                timestamp: serverTimestamp(),
            });
         } catch (error) {
             console.error("Error adding system message:", error);
             // Optionally notify user
         }
    };

    // Add user messages to the subcollection
    const addUserMessage = async (text: string) => {
        if (!gameState || !currentUser || !currentUserProfile || !text.trim()) return;

        const newMessageData = {
            senderUid: currentUser.uid,
            senderUsername: currentUserProfile.username, // Use fetched profile username
            text: text.trim(),
            timestamp: serverTimestamp(),
        };

        try {
            const messagesColRef = collection(db, "games", gameId, "messages");
            await addDoc(messagesColRef, newMessageData);
            setMessageInput(''); // Clear input only on success
        } catch (error) {
             console.error("Error sending message:", error);
             toast({ title: "Send Error", description: "Could not send message.", variant: "destructive"});
        }
    };

   const handleSendMessage = (e?: React.FormEvent) => {
       e?.preventDefault();
       if(gameState?.phase === 'discussion' && (isPlayer || isJudge)) {
           addUserMessage(messageInput);
       } else {
            toast({title:"Cannot Send", description:"Chat is only active during discussion.", variant:"destructive"})
       }
   };


   // Handle Subject Submission (Human Judge or AI)
   const handleSubjectSubmit = async (e?: React.FormEvent) => {
       e?.preventDefault();
       if (!gameState || !currentUser || gameState.phase !== 'subject-selection') return;

       let subject = '';
       let updateData: Partial<GameState> = {};

       if (gameState.judgeType === 'human' && isJudge) {
           subject = subjectInput.trim();
           if (!subject) {
               toast({ title: "Error", description: "Please enter a subject.", variant: "destructive" });
               return;
           }
           updateData = { currentSubject: subject, phase: 'discussion', lastUpdated: serverTimestamp() };
           addSystemMessage(gameId, `Subject for Round ${gameState.currentRound}: "${subject}". Players, discuss!`);

       } else if (gameState.judgeType === 'ai' && (isJudge || isPlayer)) {
           setIsAiGenerating(true);
           try {
               const result = await generateSubject({});
               subject = result.subject;
               toast({ title: "AI Generated Subject", description: `Subject: ${subject}` });
               updateData = { currentSubject: subject, phase: 'discussion', lastUpdated: serverTimestamp() };
                addSystemMessage(gameId, `AI Subject for Round ${gameState.currentRound}: "${subject}". Players, discuss!`);
           } catch (err) {
               console.error("AI Subject Generation Failed:", err);
               toast({ title: "AI Error", description: "Could not generate subject.", variant: "destructive" });
               setIsAiGenerating(false);
               return;
           } finally {
               setIsAiGenerating(false);
           }
       } else {
           toast({ title: "Not Allowed", description: "Only the judge or players (for AI judge) can set the subject.", variant: "destructive"});
           return;
       }

        // Update Firestore
        try {
            const gameDocRef = doc(db, "games", gameId);
            await updateDoc(gameDocRef, updateData);
            setSubjectInput('');
        } catch (error) {
            console.error("Error submitting subject:", error);
            toast({ title: "Error", description: "Could not update game with the subject.", variant: "destructive"});
        }
   };

    // Handle Answer Submission (by human judge)
    const handleAnswerSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!gameState || gameState.phase !== 'answering' || !isJudge || gameState.judgeType !== 'human') return;

        const answer = answerInput.trim();
        if (!answer) {
            toast({ title: "Error", description: "Please enter the final answer.", variant: "destructive" });
            return;
        }

        try {
             const gameDocRef = doc(db, "games", gameId);
             await updateDoc(gameDocRef, {
                 currentAnswer: answer,
                 phase: 'evaluation',
                 evaluationResult: null, // Clear previous evaluation
                 lastUpdated: serverTimestamp(),
             });
             setAnswerInput('');
             await addSystemMessage(gameId, `The Judge has submitted the final answer. Evaluating...`);
             // AI Evaluation will be triggered by the phase change listener (or can be called directly)
             triggerAiEvaluation(gameState.currentSubject!, answer); // Trigger evaluation immediately
        } catch (error) {
             console.error("Error submitting answer:", error);
             toast({ title: "Error", description: "Could not submit the answer.", variant: "destructive"});
        }
    };

   // Trigger AI evaluation
   const triggerAiEvaluation = async (subject: string, answer: string) => {
        if(!subject || !answer) {
            console.warn("Skipping evaluation: Subject or answer missing.");
            // Maybe move game to next round?
            return;
        }
        setIsAiEvaluating(true);
        try {
            const result = await evaluateAccuracy({ subject, answer });

            // --- Update game state with evaluation result ---
            const gameDocRef = doc(db, "games", gameId);
            const currentGameState = (await getDoc(gameDocRef)).data() as GameState; // Get fresh state

            if (!currentGameState) throw new Error("Game state not found for evaluation update.");

             // Calculate scores
             const scoreToAdd = Math.round(result.accuracyScore / 10);
             let updatedScores = { ...(currentGameState.scores || {}) };

             if (currentGameState.judgeType === 'human' && currentGameState.judgeId) {
                 updatedScores[currentGameState.judgeId] = (updatedScores[currentGameState.judgeId] || 0) + scoreToAdd;
             } else { // AI Judge - split score between players
                 currentGameState.players.forEach(p => {
                     if (p.role === 'player1' || p.role === 'player2') {
                         updatedScores[p.uid] = (updatedScores[p.uid] || 0) + Math.round(scoreToAdd / 2);
                     }
                 });
             }

             // Determine next phase
             const nextRound = currentGameState.currentRound + 1;
             const nextPhase = nextRound > currentGameState.maxRounds ? 'finished' : 'subject-selection';

             await updateDoc(gameDocRef, {
                 evaluationResult: result, // Store the full result
                 scores: updatedScores,
                 phase: nextPhase,
                 currentRound: nextPhase === 'subject-selection' ? nextRound : currentGameState.currentRound, // Only increment if not finished
                 // Clear fields for next round if applicable
                 ...(nextPhase === 'subject-selection' && {
                     currentSubject: null,
                     currentAnswer: null,
                 }),
                 lastUpdated: serverTimestamp(),
             });

             await addSystemMessage(gameId, `AI Evaluation: Score ${result.accuracyScore}/100. Justification: ${result.justification}`);
              await addSystemMessage(gameId, `Scores updated.`);

             if (nextPhase === 'finished') {
                 await addSystemMessage(gameId, `Game Over! Final Scores: ${JSON.stringify(updatedScores)}`);
             } else {
                 await addSystemMessage(gameId, `Round ${nextRound} begins! Waiting for the subject.`);
             }

        } catch (err) {
            console.error("AI Evaluation Failed:", err);
            toast({ title: "AI Error", description: "Could not evaluate the answer.", variant: "destructive" });
            // Consider how to handle evaluation failure (e.g., allow manual score, retry?)
             // For now, maybe just move to next round manually? Add a button?
             // Or set phase back? Let's move to next round for simplicity, but log error.
             try {
                const gameDocRef = doc(db, "games", gameId);
                 const currentGameState = (await getDoc(gameDocRef)).data() as GameState;
                 if(currentGameState && currentGameState.phase === 'evaluation') {
                     const nextRound = currentGameState.currentRound + 1;
                     const nextPhase = nextRound > currentGameState.maxRounds ? 'finished' : 'subject-selection';
                     await updateDoc(gameDocRef, {
                         phase: nextPhase,
                         currentRound: nextPhase === 'subject-selection' ? nextRound : currentGameState.currentRound,
                          ...(nextPhase === 'subject-selection' && { currentSubject: null, currentAnswer: null, evaluationResult: null }),
                          lastUpdated: serverTimestamp(),
                     });
                     await addSystemMessage(gameId, "AI evaluation failed. Moving to next round.");
                 }
             } catch (error) {
                 console.error("Error advancing round after evaluation failure:", error);
             }

        } finally {
            setIsAiEvaluating(false);
        }
   };

   // Advance discussion to answering phase
   const advanceToAnswering = async () => {
       if (!gameState || gameState.phase !== 'discussion') return;

        try {
             const gameDocRef = doc(db, "games", gameId);
             await updateDoc(gameDocRef, {
                 phase: 'answering',
                 lastUpdated: serverTimestamp(),
             });
             await addSystemMessage(gameId, `Discussion ended. Waiting for the final answer from the ${gameState.judgeType === 'human' ? 'Judge' : 'AI'}.`);

             // If AI judge, automatically trigger evaluation (needs consolidated answer)
             if (gameState.judgeType === 'ai' && gameState.currentSubject) {
                 // TODO: Implement actual consolidation logic
                 // Fetch recent messages, send to an AI prompt to summarize, get the answer.
                 const consolidatedAnswer = "Placeholder answer derived from chat (AI Judge)"; // Replace this

                 await updateDoc(gameDocRef, { currentAnswer: consolidatedAnswer }); // Store AI's answer
                  // Now trigger evaluation
                  triggerAiEvaluation(gameState.currentSubject, consolidatedAnswer);
             }

        } catch (error) {
            console.error("Error advancing to answering phase:", error);
            toast({ title: "Error", description: "Could not advance the game phase.", variant: "destructive"});
        }
   };

   // Handle Leaving Game
    const handleLeaveGame = async () => {
        if (!currentUser || !gameState) return;
        setIsLeaving(true);
        try {
            const gameDocRef = doc(db, "games", gameId);
            // Remove player from the players array in Firestore
            const playerToRemove: Player | undefined = gameState.players.find(p => p.uid === currentUser.uid);
            if (playerToRemove) {
                await updateDoc(gameDocRef, {
                    players: arrayRemove(playerToRemove) // Use the whole object for removal if it's structured
                    // Or if just storing UIDs: players: arrayRemove(currentUser.uid)
                });
                await addSystemMessage(gameId, `${currentUserProfile?.username || 'A player'} left the game.`);
                 // Add logic: If judge leaves, maybe end game or assign new judge?
                 // If player leaves, maybe end game if not enough players?
            }
             toast({ title: "Left Game", description: "You have left the game.", variant: "default"});
            router.push('/lobby');

        } catch (error) {
            console.error("Error leaving game:", error);
            toast({ title: "Error", description: "Could not leave the game.", variant: "destructive"});
             setIsLeaving(false); // Only set false on error
        }
        // No need to set setIsLeaving(false) on success due to navigation
    };


  // --- Rendering ---

  if (isLoading || !currentUser || !currentUserProfile) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (error || !gameState) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
             <Card className="w-full max-w-md text-center">
                <CardHeader><CardTitle>Error Loading Game</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-destructive">{error || "An unknown error occurred."}</p>
                    <Button onClick={() => router.push('/lobby')} className="mt-4">Back to Lobby</Button>
                </CardContent>
             </Card>
        </div>
    );
  }

  const renderPlayer = (player: Player) => (
    <div key={player.uid} className="flex items-center gap-2 p-2 bg-secondary rounded">
      <Avatar className="h-8 w-8">
        <AvatarImage src={player.avatarUrl} alt={player.username} data-ai-hint="user avatar"/>
        <AvatarFallback>{player.username.substring(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="text-sm font-medium truncate">{player.username} {player.uid === currentUser?.uid ? '(You)' : ''}</p>
        <Badge variant={player.role === 'judge' ? 'default' : 'secondary'} className="text-xs">
          {player.role === 'judge' ? <Crown className="h-3 w-3 mr-1"/> : player.role === 'spectator' ? null : <UserCheck className="h-3 w-3 mr-1"/> }
          {player.role.charAt(0).toUpperCase() + player.role.slice(1)}
        </Badge>
      </div>
       <p className="text-xs font-bold">{gameState.scores?.[player.uid] || 0} pts</p>
    </div>
  );

  const renderPhaseContent = () => {
    switch (gameState.phase) {
      case 'waiting':
        return <p className="text-center text-muted-foreground p-4">Waiting for players... ({gameState.players.length}/{gameState.maxPlayers})</p>;

      case 'subject-selection':
         if (gameState.judgeType === 'human') {
             return isJudge ? (
                 <form onSubmit={handleSubjectSubmit} className="p-4 space-y-2">
                    <Label htmlFor="subject">Enter the Subject for Round {gameState.currentRound}:</Label>
                    <Input id="subject" value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} placeholder="e.g., The History of Pizza" />
                    <Button type="submit" className="w-full" disabled={isLoading}>Submit Subject</Button>
                 </form>
             ) : (
                  <p className="text-center text-muted-foreground p-4">Waiting for the Judge ({judgePlayer?.username || '...'}) to select a subject...</p>
             );
         } else { // AI Judge
              // Allow any player to trigger generation
              return (isPlayer || isJudge) ? (
                  <div className="p-4 text-center">
                     <p className="text-muted-foreground mb-2">AI Judge will select the subject for Round {gameState.currentRound}.</p>
                     <Button onClick={() => handleSubjectSubmit()} disabled={isAiGenerating || isLoading} className="mx-auto">
                          {isAiGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                          {isAiGenerating ? 'Generating...' : 'Generate Subject Now'}
                      </Button>
                  </div>
              ) : (
                   <p className="text-center text-muted-foreground p-4">AI Judge is selecting the subject...</p>
              );
         }

      case 'discussion':
        return (
            <div className="p-4 space-y-2">
                <p className="font-semibold">Subject: <span className="font-normal text-primary">{gameState.currentSubject || '...'}</span></p>
                <p className="text-sm text-muted-foreground">Discuss the subject and formulate your answer.</p>
                 {/* TODO: Add a timer */}
                 {(isJudge || isPlayer) && ( // Allow judge or players to end discussion
                      <Button onClick={advanceToAnswering} variant="outline" size="sm" disabled={isLoading}>
                          End Discussion & Proceed to Answer
                      </Button>
                 )}
            </div>
        );

      case 'answering':
         if (gameState.judgeType === 'human') {
             return isJudge ? (
                 <form onSubmit={handleAnswerSubmit} className="p-4 space-y-2">
                    <Label htmlFor="answer">Enter the Final Answer based on discussion:</Label>
                    <Textarea id="answer" value={answerInput} onChange={(e) => setAnswerInput(e.target.value)} placeholder="Consolidated answer..." />
                    <Button type="submit" className="w-full" disabled={isAiEvaluating || isLoading}>
                        {isAiEvaluating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Submit Answer & Evaluate
                     </Button>
                 </form>
             ) : (
                 <p className="text-center text-muted-foreground p-4">Waiting for the Judge ({judgePlayer?.username || '...'}) to submit the final answer...</p>
             );
         } else { // AI Judge
             return (
                 <p className="text-center text-muted-foreground p-4">
                    {isAiEvaluating ? <Loader2 className="inline h-4 w-4 mr-2 animate-spin" /> : null }
                    AI Judge is compiling the answer based on discussion and evaluating...
                 </p>
             );
         }

      case 'evaluation':
        return (
          <div className="p-4 space-y-2 text-center">
              {isAiEvaluating ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground">Evaluating answer...</p>
                  </>
              ) : gameState.evaluationResult ? (
                  <>
                    <p className="font-semibold text-xl">Round {gameState.currentRound} Result</p>
                    <p>Subject: <span className="text-primary">{gameState.currentSubject}</span></p>
                    <p>Answer: <span className="text-secondary-foreground">{gameState.currentAnswer}</span></p>
                    <p className="mt-2">Accuracy Score: <span className="text-2xl font-bold text-primary">{gameState.evaluationResult.score}/100</span></p>
                    <p className="text-sm text-muted-foreground mt-1">Justification: {gameState.evaluationResult.justification}</p>
                    {/* Auto-advance usually handles this, button only needed for manual override */}
                  </>
              ) : (
                   <p className="text-muted-foreground">Waiting for evaluation results...</p>
              )
              }
          </div>
        );

      case 'finished':
          const winnerEntry = Object.entries(gameState.scores || {}).sort(([,a],[,b]) => b-a)[0];
          const winnerPlayer = gameState.players.find(p => p.uid === winnerEntry?.[0]);
          return (
              <div className="p-4 space-y-2 text-center">
                <p className="font-bold text-2xl text-primary">Game Over!</p>
                <p>Final Scores:</p>
                <ul className="list-none p-0">
                    {gameState.players.map(p => (
                        <li key={p.uid}>{p.username}: {gameState.scores?.[p.uid] || 0} pts</li>
                    ))}
                </ul>
                 {winnerPlayer && <p className="mt-4 font-semibold">Winner: {winnerPlayer.username} with {winnerEntry[1]} points! <Crown className="inline h-5 w-5 text-yellow-500"/></p>}
                <Button onClick={() => router.push('/lobby')} className="mt-4">Back to Lobby</Button>
              </div>
          );

      default:
        return <p className="text-center text-muted-foreground p-4">Unknown game phase.</p>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-12rem)] max-h-[calc(100vh-12rem)]">
      {/* Players & Game Info */}
      <Card className="lg:col-span-1 flex flex-col shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl"><Users className="h-5 w-5 text-primary"/> Players & Info</CardTitle>
          <CardDescription>{gameState.name}</CardDescription>
           <div className="pt-2 space-y-1">
            <p className="text-sm font-medium">Round: {gameState.currentRound}/{gameState.maxRounds}</p>
            <Progress value={gameState.phase === 'finished' ? 100 : ((gameState.currentRound -1) / gameState.maxRounds) * 100} className="h-2" />
             <p className="text-sm font-medium">Phase: <span className="text-primary capitalize">{gameState.phase.replace('-', ' ')}</span></p>
             <p className="text-sm font-medium">Judge: <span className="text-primary">{gameState.judgeType === 'ai' ? 'AI' : judgePlayer?.username || 'N/A'}</span></p>
           </div>
        </CardHeader>
        <CardContent className="flex-grow space-y-2 overflow-y-auto">
            {gameState.players.map(renderPlayer)}
             {gameState.players.length < gameState.maxPlayers && gameState.phase === 'waiting' && (
                 <div className="text-center p-4 border border-dashed rounded text-muted-foreground">Waiting for more players...</div>
             )}
             {gameState.players.length === 0 && gameState.phase !== 'waiting' && (
                  <div className="text-center p-4 border border-dashed rounded text-destructive">No players remaining.</div>
             )}
        </CardContent>
         <CardFooter className="p-2 border-t">
              <Button variant="outline" size="sm" onClick={handleLeaveGame} disabled={isLeaving}>
                   {isLeaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4"/>}
                   Leave Game
              </Button>
        </CardFooter>
      </Card>

      {/* Main Game Area (Chat & Phase Content) */}
      <Card className="lg:col-span-2 flex flex-col shadow-lg h-full">
        <CardHeader className="flex-shrink-0">
           <CardTitle className="flex items-center gap-2 text-xl capitalize">
                {gameState.phase.replace('-', ' ')}
                {gameState.phase === 'discussion' && gameState.currentSubject && <HelpCircle className="h-4 w-4 text-muted-foreground"/>}
           </CardTitle>
        </CardHeader>

        {/* Phase specific controls/info */}
        <div className="flex-shrink-0 border-b">
            {renderPhaseContent()}
        </div>

        {/* Chat Area (Always visible except maybe 'finished') */}
        {gameState.phase !== 'finished' && (
           <>
             <ScrollArea ref={scrollAreaRef} className="flex-grow p-4 space-y-3">
                {messages.map((msg) => (
                <div key={msg.id} className={`flex mb-2 ${
                     msg.senderUid === currentUser?.uid ? 'justify-end' :
                     msg.senderUid === 'system' || msg.senderUid === 'ai-judge' ? 'justify-center' : 'justify-start' // Align left for others
                    }`}>
                    <div className={`p-2 rounded-lg max-w-[75%] shadow-sm ${
                        msg.senderUid === currentUser?.uid ? 'bg-primary text-primary-foreground' :
                        msg.senderUid === 'system' ? 'bg-transparent text-muted-foreground italic text-xs text-center w-full' :
                        msg.senderUid === 'ai-judge' ? 'bg-purple-800 text-purple-100' : // Keep AI judge style
                        'bg-secondary text-secondary-foreground' // Default for other users
                    }`}>
                    {msg.senderUid !== 'system' && msg.senderUid !== currentUser?.uid && <p className="text-xs font-semibold mb-0.5 opacity-80">{msg.senderUsername}</p>}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    {/* Optional Timestamp display */}
                    {/* <p className="text-xs opacity-60 mt-1 text-right">
                       {msg.timestamp instanceof Timestamp ? format(msg.timestamp.toDate(), 'p') : '...'}
                    </p> */}
                    </div>
                </div>
                ))}
                 {/* Add an empty div at the bottom to ensure scroll pushes content up */}
                {/* <div ref={messagesEndRef} /> */}
             </ScrollArea>
             <CardFooter className="p-4 border-t flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex w-full gap-2">
                <Input
                    placeholder={currentUserRole === 'spectator' ? "Spectating..." : gameState.phase === 'discussion' ? "Type your message..." : "Chat disabled"}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={gameState.phase !== 'discussion' || currentUserRole === 'spectator' || isLoading || isAiGenerating || isAiEvaluating}
                />
                <Button type="submit"
                    disabled={gameState.phase !== 'discussion' || currentUserRole === 'spectator' || isLoading || isAiGenerating || isAiEvaluating || !messageInput.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
                </form>
             </CardFooter>
           </>
        )}
         {/* Show simplified view for finished state */}
        {gameState.phase === 'finished' && (
             <div className="flex-grow p-4">{renderPhaseContent()}</div>
        )}
      </Card>
    </div>
  );
}

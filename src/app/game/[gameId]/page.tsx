'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Send, Crown, Users, BrainCircuit, UserCheck, HelpCircle } from 'lucide-react'; // Added icons
import { useToast } from "@/hooks/use-toast";
import { generateSubject } from '@/ai/flows/ai-subject-generation'; // Import AI function
import { evaluateAccuracy } from '@/ai/flows/ai-accuracy-evaluation'; // Import AI function

// --- Types ---
type PlayerRole = 'judge' | 'player1' | 'player2' | 'spectator';
type GamePhase = 'waiting' | 'subject-selection' | 'discussion' | 'answering' | 'evaluation' | 'finished';

interface Player {
  id: string;
  username: string;
  role: PlayerRole;
  isReady?: boolean;
  avatarUrl?: string;
}

interface Message {
  id: string;
  sender: string; // username or 'System' or 'AI Judge'
  text: string;
  timestamp: number;
}

interface GameState {
  id: string;
  name: string;
  players: Player[];
  currentRound: number;
  maxRounds: number;
  phase: GamePhase;
  judgeType: 'human' | 'ai';
  currentSubject: string | null;
  currentAnswer: string | null;
  messages: Message[];
  scores: Record<string, number>; // Player ID to score
  evaluationResult?: { score: number; justification: string };
}

// --- Mock Data & Functions (Replace with MongoDB/WebSockets) ---

const MOCK_NAMES = ["Alex", "Jamie", "Casey", "Riley", "Jordan"];

// Function to get the current user's info (replace with real auth)
const getCurrentUserInfo = (): { userId: string, username: string } => {
    const username = localStorage.getItem('username') || `User_${Math.random().toString(36).substring(7)}`;
    // Use username as ID for simplicity in mock setup
    return { userId: username, username: username };
};

const createMockGameState = (gameId: string, isNew: boolean, judgeTypePref: 'human' | 'ai' = 'human'): GameState => {
  const currentUserInfo = getCurrentUserInfo();
  const initialPlayer: Player = {
    id: currentUserInfo.userId,
    username: currentUserInfo.username,
    // Assign role based on whether it's a new game or joining
    role: isNew ? judgeTypePref === 'human' ? 'judge' : 'player1' : 'spectator', // Assign judge if creating, otherwise spectator initially
    isReady: false,
    avatarUrl: `https://i.pravatar.cc/150?u=${currentUserInfo.userId}`
  };

  // Add some mock players if joining an existing game (or for testing)
   const mockPlayers = !isNew ? [
       { id: 'bot1', username: 'Bot Alice', role: judgeTypePref === 'human' ? 'player1' : 'judge', isReady: true, avatarUrl: 'https://i.pravatar.cc/150?u=bot1' },
       { id: 'bot2', username: 'Bot Bob', role: 'player2', isReady: true, avatarUrl: 'https://i.pravatar.cc/150?u=bot2' }
    ] : [];


  return {
    id: gameId,
    name: `Trial ${gameId.substring(0, 4)}`,
    players: [initialPlayer, ...mockPlayers].slice(0, 3), // Ensure max 3 players
    currentRound: 0,
    maxRounds: 10,
    phase: isNew ? 'waiting' : mockPlayers.length >= 2 ? 'subject-selection' : 'waiting', // Start selecting if full
    judgeType: isNew ? judgeTypePref : initialGamesData[gameId]?.judgeType || 'human', // Get judge type from mock or default
    currentSubject: null,
    currentAnswer: null,
    messages: [{ id: 'm0', sender: 'System', text: 'Welcome to the game!', timestamp: Date.now() }],
    scores: {},
  };
};

// Simulate some existing games data (like in lobby)
const initialGamesData: Record<string, Partial<GameState>> = {
    'g1': { judgeType: 'human', name: 'Beginner Banter' },
    'g2': { judgeType: 'ai', name: 'AI Arena' },
    'g3': { judgeType: 'human', name: 'Pro Players' },
    'g4': { judgeType: 'ai', name: 'Casual Chat' },
};

// --- Component ---

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const gameId = params.gameId as string;
  const isNewGame = searchParams.get('new') === 'true';

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserInfo, setCurrentUserInfo] = useState<{ userId: string, username: string } | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAiEvaluating, setIsAiEvaluating] = useState(false);

  const currentUserRole = gameState?.players.find(p => p.id === currentUserInfo?.userId)?.role;
  const isJudge = currentUserRole === 'judge';
  const isPlayer = currentUserRole === 'player1' || currentUserRole === 'player2';
  const judgePlayer = gameState?.players.find(p => p.role === 'judge');

  // --- Effects ---

  // Initial Load & Authentication Check
  useEffect(() => {
    const userInfo = getCurrentUserInfo();
    if (!localStorage.getItem('isAuthenticated')) {
      toast({ title: "Access Denied", description: "Please log in.", variant: "destructive" });
      router.push('/auth');
      return;
    }
    setCurrentUserInfo(userInfo);

    setIsLoading(true);
    setError(null);
    console.log(`Loading game: ${gameId}, New: ${isNewGame}`);

    // --- Placeholder for Fetching/Creating Game State (replace with API/WebSockets) ---
    const loadGame = async () => {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
      try {
         // Simulate fetching or creating
        const existingGame = initialGamesData[gameId]; // Check if ID exists in mock lobby data
        const judgeTypePref = existingGame?.judgeType || (isNewGame ? 'human' : 'human'); // Default to human if not specified
        let loadedState = createMockGameState(gameId, isNewGame, judgeTypePref);

        // If joining, try to assign a role if spectator
        if (!isNewGame && loadedState.players.find(p => p.id === userInfo.userId)?.role === 'spectator') {
           const availablePlayerRole = loadedState.players.some(p => p.role === 'player1') ? 'player2' : 'player1';
           const judgeExists = loadedState.players.some(p => p.role === 'judge');

           if (loadedState.players.length < 3) {
               if (!judgeExists && loadedState.judgeType === 'human') {
                   // Assign as judge if human judge needed and no judge exists
                   loadedState.players = loadedState.players.map(p => p.id === userInfo.userId ? { ...p, role: 'judge' } : p);
                   addSystemMessage(loadedState, `${userInfo.username} is now the Judge.`);
               } else if (availablePlayerRole === 'player1' || availablePlayerRole === 'player2') {
                   // Assign as player if spot available
                    loadedState.players = loadedState.players.map(p => p.id === userInfo.userId ? { ...p, role: availablePlayerRole } : p);
                    addSystemMessage(loadedState, `${userInfo.username} joined as ${availablePlayerRole}.`);
               }
           }
        }

         // Check if game should start
         if (loadedState.players.length === 3 && loadedState.phase === 'waiting') {
            loadedState.phase = 'subject-selection';
            loadedState.currentRound = 1;
            addSystemMessage(loadedState, `Round 1 begins! Waiting for the subject.`);
         }

        setGameState(loadedState);
      } catch (err) {
        console.error("Failed to load game:", err);
        setError("Could not load game data. It might not exist or there was a connection issue.");
        toast({ title: "Error", description: "Failed to load game.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    loadGame();
    // --- End Placeholder ---

    // Add WebSocket listener setup here in a real app
    // e.g., socket.on('gameStateUpdate', (newState) => setGameState(newState));

    return () => {
      // Clean up WebSocket listeners here
      // e.g., socket.off('gameStateUpdate');
    };
  }, [gameId, isNewGame, router, toast]);


  // --- Actions ---

  // Helper to add system messages (modify for WebSocket emit)
  const addSystemMessage = (state: GameState, text: string): GameState => {
      const newMessage: Message = {
          id: `m${Date.now()}`,
          sender: 'System',
          text,
          timestamp: Date.now(),
      };
      state.messages = [...state.messages, newMessage];
      return state; // In real app, this would likely be handled by backend emitting new state
  };

  // Helper to add user messages (modify for WebSocket emit)
   const addUserMessage = (text: string) => {
       if (!gameState || !currentUserInfo || !text.trim()) return;

       const newMessage: Message = {
           id: `m${Date.now()}`,
           sender: currentUserInfo.username,
           text: text.trim(),
           timestamp: Date.now(),
       };

       // --- Placeholder for emitting message via WebSocket ---
       console.log("Sending message:", newMessage);
       // socket.emit('sendMessage', { gameId, message: newMessage });
       const newState = { ...gameState, messages: [...gameState.messages, newMessage] };
       setGameState(newState); // Optimistic update
       // --- End Placeholder ---

       setMessageInput('');
   };

   const handleSendMessage = (e?: React.FormEvent) => {
       e?.preventDefault();
       addUserMessage(messageInput);
   };


   // Handle Subject Submission (Human Judge or AI)
   const handleSubjectSubmit = async (e?: React.FormEvent) => {
       e?.preventDefault();
       if (!gameState || gameState.phase !== 'subject-selection') return;

       let subject = '';
       if (gameState.judgeType === 'human' && isJudge) {
           subject = subjectInput.trim();
           if (!subject) {
               toast({ title: "Error", description: "Please enter a subject.", variant: "destructive" });
               return;
           }
       } else if (gameState.judgeType === 'ai' && (isJudge || isPlayer)) { // Allow any player to trigger AI generation if AI judge
           setIsAiGenerating(true);
           try {
               // Add optional topic later if needed: const result = await generateSubject({ topic: 'optional' });
               const result = await generateSubject({});
               subject = result.subject;
               toast({ title: "AI Generated Subject", description: `Subject: ${subject}` });
           } catch (err) {
               console.error("AI Subject Generation Failed:", err);
               toast({ title: "AI Error", description: "Could not generate subject.", variant: "destructive" });
               setIsAiGenerating(false);
               return;
           } finally {
               setIsAiGenerating(false);
           }
       } else {
           return; // Not allowed to submit
       }

       // --- Placeholder for updating game state via WebSocket ---
       console.log("Submitting subject:", subject);
       // socket.emit('submitSubject', { gameId, subject });
       let newState = { ...gameState, currentSubject: subject, phase: 'discussion' as GamePhase };
       newState = addSystemMessage(newState, `Subject for Round ${gameState.currentRound}: "${subject}". Players, discuss!`);
       setGameState(newState); // Optimistic update
       // --- End Placeholder ---
       setSubjectInput('');
   };

    // Handle Answer Submission
    const handleAnswerSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!gameState || gameState.phase !== 'answering' || !isJudge || gameState.judgeType !== 'human') return;

        const answer = answerInput.trim();
        if (!answer) {
            toast({ title: "Error", description: "Please enter the final answer.", variant: "destructive" });
            return;
        }

        // --- Placeholder for updating game state via WebSocket ---
        console.log("Submitting answer:", answer);
        // socket.emit('submitAnswer', { gameId, answer });
        let newState = { ...gameState, currentAnswer: answer, phase: 'evaluation' as GamePhase, evaluationResult: undefined };
        newState = addSystemMessage(newState, `The Judge has submitted the final answer. Evaluating...`);
        setGameState(newState); // Optimistic update
        // --- End Placeholder ---
        setAnswerInput('');

        // Trigger AI Evaluation
        await triggerAiEvaluation(newState.currentSubject!, answer);
    };

   // Trigger AI evaluation
   const triggerAiEvaluation = async (subject: string, answer: string) => {
        if(!gameState) return;
        setIsAiEvaluating(true);
        try {
            const result = await evaluateAccuracy({ subject, answer });

            // --- Placeholder for updating game state with evaluation via WebSocket ---
            console.log("AI Evaluation Result:", result);
             // socket.emit('submitEvaluation', { gameId, evaluation: result });
             let newState = { ...gameState, evaluationResult: result };
             newState = addSystemMessage(newState, `AI Evaluation: Score ${result.accuracyScore}/100. Justification: ${result.justification}`);

             // Add score logic here - simplistic example: add score to judge if human judge, split between players if AI judge
              const scoreToAdd = Math.round(result.accuracyScore / 10); // Example scoring
              let updatedScores = { ...newState.scores };

              if (newState.judgeType === 'human' && judgePlayer) {
                    updatedScores[judgePlayer.id] = (updatedScores[judgePlayer.id] || 0) + scoreToAdd;
              } else { // AI Judge - split score between players
                    newState.players.forEach(p => {
                        if (p.role === 'player1' || p.role === 'player2') {
                             updatedScores[p.id] = (updatedScores[p.id] || 0) + Math.round(scoreToAdd / 2);
                        }
                    });
              }
               newState.scores = updatedScores;
               newState = addSystemMessage(newState, `Scores updated.`);

             // Move to next phase or end game
             if (newState.currentRound >= newState.maxRounds) {
                newState.phase = 'finished';
                 newState = addSystemMessage(newState, `Game Over! Final Scores: ${JSON.stringify(newState.scores)}`);
             } else {
                newState.phase = 'subject-selection';
                newState.currentRound += 1;
                newState.currentSubject = null;
                newState.currentAnswer = null;
                newState.evaluationResult = undefined;
                 newState = addSystemMessage(newState, `Round ${newState.currentRound} begins! Waiting for the subject.`);
             }

             setGameState(newState);
             // --- End Placeholder ---

        } catch (err) {
            console.error("AI Evaluation Failed:", err);
            toast({ title: "AI Error", description: "Could not evaluate the answer.", variant: "destructive" });
             // Allow manual progression or retry? For now, just log error.
             // Maybe set phase back to answering or add a manual override button?
        } finally {
            setIsAiEvaluating(false);
        }
   };

   // TEMP: Manual button to advance discussion to answering (for testing)
   const advanceToAnswering = () => {
       if (!gameState || gameState.phase !== 'discussion') return;
        // --- Placeholder for updating game state via WebSocket ---
        console.log("Advancing to answering phase");
        // socket.emit('advancePhase', { gameId, phase: 'answering' });
        let newState = { ...gameState, phase: 'answering' as GamePhase };
        newState = addSystemMessage(newState, `Discussion ended. Waiting for the final answer from the ${gameState.judgeType === 'human' ? 'Judge' : 'players'}.`); // Adjust message later for AI answer consolidation
        setGameState(newState); // Optimistic update
        // --- End Placeholder ---

        // If AI judge, automatically trigger evaluation (using consolidated discussion - needs implementation)
        if(gameState.judgeType === 'ai'){
            // TODO: Implement logic to get 'final answer' from player discussion for AI judge
            const consolidatedAnswer = "Placeholder answer derived from chat"; // Replace this
            newState = { ...gameState, currentAnswer: consolidatedAnswer };
            setGameState(newState);
            triggerAiEvaluation(gameState.currentSubject!, consolidatedAnswer);
        }
   };


  // --- Rendering ---

  if (isLoading) {
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
    <div key={player.id} className="flex items-center gap-2 p-2 bg-secondary rounded">
      <Avatar className="h-8 w-8">
        <AvatarImage src={player.avatarUrl} alt={player.username} data-ai-hint="user avatar"/>
        <AvatarFallback>{player.username.substring(0, 1)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="text-sm font-medium truncate">{player.username} {player.id === currentUserInfo?.userId ? '(You)' : ''}</p>
        <Badge variant={player.role === 'judge' ? 'default' : 'secondary'} className="text-xs">
          {player.role === 'judge' ? <Crown className="h-3 w-3 mr-1"/> : <UserCheck className="h-3 w-3 mr-1"/> }
          {player.role.charAt(0).toUpperCase() + player.role.slice(1)}
        </Badge>
      </div>
       <p className="text-xs font-bold">{gameState.scores[player.id] || 0} pts</p>
    </div>
  );

  const renderPhaseContent = () => {
    switch (gameState.phase) {
      case 'waiting':
        return <p className="text-center text-muted-foreground p-4">Waiting for players... ({gameState.players.length}/3)</p>;

      case 'subject-selection':
         if (gameState.judgeType === 'human') {
             return isJudge ? (
                 <form onSubmit={handleSubjectSubmit} className="p-4 space-y-2">
                    <Label htmlFor="subject">Enter the Subject for Round {gameState.currentRound}:</Label>
                    <Input id="subject" value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} placeholder="e.g., The History of Pizza" />
                    <Button type="submit" className="w-full">Submit Subject</Button>
                 </form>
             ) : (
                  <p className="text-center text-muted-foreground p-4">Waiting for the Judge ({judgePlayer?.username}) to select a subject...</p>
             );
         } else { // AI Judge
              return (
                  <div className="p-4 text-center">
                     <p className="text-muted-foreground mb-2">AI Judge is selecting the subject for Round {gameState.currentRound}...</p>
                     <Button onClick={() => handleSubjectSubmit()} disabled={isAiGenerating} className="mx-auto">
                          {isAiGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                          {isAiGenerating ? 'Generating...' : 'Generate Subject Now'}
                      </Button>
                  </div>
              );
         }

      case 'discussion':
        return (
            <div className="p-4 space-y-2">
                <p className="font-semibold">Subject: <span className="font-normal text-primary">{gameState.currentSubject}</span></p>
                <p className="text-sm text-muted-foreground">Discuss the subject and ask clarifying questions.</p>
                 {/* Add a timer here later */}
                 {/* TEMP button to advance phase */}
                 {(isJudge || isPlayer) && <Button onClick={advanceToAnswering} variant="outline" size="sm">End Discussion & Proceed to Answer</Button>}
            </div>
        );

      case 'answering':
         if (gameState.judgeType === 'human') {
             return isJudge ? (
                 <form onSubmit={handleAnswerSubmit} className="p-4 space-y-2">
                    <Label htmlFor="answer">Enter the Final Answer based on discussion:</Label>
                    <Textarea id="answer" value={answerInput} onChange={(e) => setAnswerInput(e.target.value)} placeholder="Consolidated answer..." />
                    <Button type="submit" className="w-full" disabled={isAiEvaluating}>
                        {isAiEvaluating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Submit Answer & Evaluate
                     </Button>
                 </form>
             ) : (
                 <p className="text-center text-muted-foreground p-4">Waiting for the Judge ({judgePlayer?.username}) to submit the final answer...</p>
             );
         } else { // AI Judge
             return (
                 <p className="text-center text-muted-foreground p-4">AI Judge is compiling the answer based on your discussion and evaluating...</p>
                 // Show loader if isAiEvaluating is true
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
                    {/* Button to proceed might be needed if auto-advance fails */}
                  </>
              ) : (
                   <p className="text-muted-foreground">Waiting for evaluation results...</p>
              )
              }
          </div>
        );

      case 'finished':
          const winner = Object.entries(gameState.scores).sort(([,a],[,b]) => b-a)[0];
          const winnerPlayer = gameState.players.find(p => p.id === winner[0]);
          return (
              <div className="p-4 space-y-2 text-center">
                <p className="font-bold text-2xl text-primary">Game Over!</p>
                <p>Final Scores:</p>
                <ul className="list-none p-0">
                    {gameState.players.map(p => (
                        <li key={p.id}>{p.username}: {gameState.scores[p.id] || 0} pts</li>
                    ))}
                </ul>
                 {winnerPlayer && <p className="mt-4 font-semibold">Winner: {winnerPlayer.username} with {winner[1]} points! <Crown className="inline h-5 w-5 text-yellow-500"/></p>}
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
            <Progress value={(gameState.currentRound / gameState.maxRounds) * 100} className="h-2" />
             <p className="text-sm font-medium">Phase: <span className="text-primary">{gameState.phase.replace('-', ' ')}</span></p>
             <p className="text-sm font-medium">Judge: <span className="text-primary">{gameState.judgeType === 'ai' ? 'AI' : judgePlayer?.username || 'N/A'}</span></p>
           </div>
        </CardHeader>
        <CardContent className="flex-grow space-y-2 overflow-y-auto">
            {gameState.players.map(renderPlayer)}
             {gameState.players.length < 3 && gameState.phase === 'waiting' && (
                 <div className="text-center p-4 border border-dashed rounded text-muted-foreground">Waiting for more players...</div>
             )}
        </CardContent>
         <CardFooter className="p-2 border-t">
              <Button variant="outline" size="sm" onClick={() => router.push('/lobby')}>Leave Game</Button>
        </CardFooter>
      </Card>

      {/* Main Game Area (Chat & Phase Content) */}
      <Card className="lg:col-span-2 flex flex-col shadow-lg h-full">
        <CardHeader className="flex-shrink-0">
           <CardTitle className="flex items-center gap-2 text-xl">
                {gameState.phase === 'discussion' || gameState.phase === 'waiting' ? 'Chat & Discussion' :
                 gameState.phase === 'subject-selection' ? 'Subject Selection' :
                 gameState.phase === 'answering' ? 'Final Answer Submission' :
                 gameState.phase === 'evaluation' ? 'Round Evaluation' :
                 gameState.phase === 'finished' ? 'Game Results' :
                 'Game Area'}
                 {gameState.phase === 'discussion' && gameState.currentSubject && <HelpCircle className="h-4 w-4 text-muted-foreground"/>}
           </CardTitle>
        </CardHeader>

        {/* Phase specific controls/info */}
        <div className="flex-shrink-0 border-b">
            {renderPhaseContent()}
        </div>

        {/* Chat Area (Visible during discussion and other relevant phases) */}
        {(gameState.phase === 'discussion' || gameState.phase === 'subject-selection' || gameState.phase === 'answering' || gameState.phase === 'waiting') && (
           <>
             <ScrollArea className="flex-grow p-4 space-y-3">
                {gameState.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === currentUserInfo?.username ? 'justify-end' : ''} ${msg.sender === 'System' || msg.sender === 'AI Judge' ? 'justify-center' : ''}`}>
                    <div className={`p-2 rounded-lg max-w-[75%] ${
                        msg.sender === currentUserInfo?.username ? 'bg-primary text-primary-foreground' :
                        msg.sender === 'System' ? 'bg-transparent text-muted-foreground italic text-xs text-center w-full' :
                        msg.sender === 'AI Judge' ? 'bg-purple-800 text-purple-100' :
                        'bg-secondary text-secondary-foreground'
                    }`}>
                    {msg.sender !== 'System' && msg.sender !== currentUserInfo?.username && <p className="text-xs font-semibold mb-0.5 opacity-80">{msg.sender}</p>}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    {/* <p className="text-xs opacity-60 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p> */}
                    </div>
                </div>
                ))}
             </ScrollArea>
             <CardFooter className="p-4 border-t flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex w-full gap-2">
                <Input
                    placeholder={isPlayer || isJudge ? "Type your message..." : "Spectating..."}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={gameState.phase !== 'discussion' || (!isPlayer && !isJudge) || isLoading}
                />
                <Button type="submit" disabled={gameState.phase !== 'discussion' || (!isPlayer && !isJudge) || isLoading || !messageInput.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
                </form>
             </CardFooter>
           </>
        )}
      </Card>
    </div>
  );
}

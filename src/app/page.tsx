import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, LogIn } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Welcome to Triad Trials!</CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            Engage in a 3-player game where communication and accuracy are key.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 items-center">
          <p className="text-center">
            Join or create a game, choose your role, and test your skills over 10 rounds.
          </p>
          <div className="flex gap-4 mt-4">
            <Button asChild variant="secondary">
              <Link href="/auth">
                <LogIn className="mr-2 h-4 w-4" /> Login / Sign Up
              </Link>
            </Button>
            <Button asChild>
              <Link href="/lobby">
                <Users className="mr-2 h-4 w-4" /> Go to Lobby
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

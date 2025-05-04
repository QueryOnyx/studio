
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase"; // Import Firebase auth instance

const formSchema = z.object({
  // Use email for Firebase login
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

interface LoginFormProps {
  onSuccess: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "", // Default to email
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    form.clearErrors(); // Clear previous errors

    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      if (user) {
        toast({
          title: "Login Successful",
          description: `Welcome back!`, // Username is not directly available here, will be handled by Header
        });
        // No need for localStorage, auth state is handled by Firebase SDK and Header
        onSuccess(); // Call the onSuccess prop (might be used for UI updates)
        router.push('/lobby'); // Redirect to lobby after successful login
      } else {
        // This case should technically not happen if signInWithEmailAndPassword resolves
        throw new Error("Login failed: No user found.");
      }
    } catch (error: any) {
        console.error("Firebase Login Error:", error);
        let errorMessage = "An unexpected error occurred during login.";
        // Handle specific Firebase error codes
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = "Invalid email format.";
                form.setError("email", { type: "manual", message: errorMessage });
                break;
            case 'auth/user-disabled':
                errorMessage = "This account has been disabled.";
                break;
            case 'auth/user-not-found':
            case 'auth/invalid-credential': // Covers wrong password and non-existent user
                 errorMessage = "Invalid email or password.";
                 form.setError("email", { type: "manual", message: " " }); // Clear error for specific field
                 form.setError("password", { type: "manual", message: errorMessage });
                 break;
            default:
                // Generic error for other issues
                errorMessage = "Login failed. Please try again.";
                break;
        }
        toast({
            title: "Login Failed",
            description: errorMessage,
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email" // Change name to email
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel> {/* Change label */}
              <FormControl>
                <Input type="email" placeholder="Enter your email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter your password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Login
        </Button>
      </form>
    </Form>
  );
}

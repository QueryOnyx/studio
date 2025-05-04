
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
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase"; // Import Firebase auth and db instances

const formSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }).max(20, { message: "Username cannot exceed 20 characters."}),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});

interface SignupFormProps {
  onSuccess: () => void;
}

export default function SignupForm({ onSuccess }: SignupFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    form.clearErrors(); // Clear previous errors

    try {
      // 1. Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // 2. Update Firebase Auth profile with username (optional but good practice)
      await updateProfile(user, { displayName: values.username });

      // 3. Create user document in Firestore
      const userDocRef = doc(db, "users", user.uid); // Use UID as document ID
      await setDoc(userDocRef, {
        username: values.username,
        email: values.email,
        createdAt: serverTimestamp(), // Use Firestore server timestamp
        joinDate: serverTimestamp(), // Use Firestore server timestamp
        gamesPlayed: 0,
        winRate: 0,
        // Add other default fields if needed
      });

      toast({
        title: "Signup Successful",
        description: "Your account has been created. Please log in.",
      });
      onSuccess(); // Switch to login tab

    } catch (error: any) {
      console.error("Firebase Signup Error:", error);
      let errorMessage = "An unexpected error occurred during signup.";
      // Handle specific Firebase error codes
       switch (error.code) {
           case 'auth/email-already-in-use':
               errorMessage = "This email address is already in use.";
               form.setError("email", { type: "manual", message: errorMessage });
               break;
           case 'auth/invalid-email':
               errorMessage = "Invalid email format.";
               form.setError("email", { type: "manual", message: errorMessage });
               break;
           case 'auth/operation-not-allowed':
               errorMessage = "Email/password accounts are not enabled.";
               break;
           case 'auth/weak-password':
               errorMessage = "Password is too weak. It must be at least 6 characters.";
                form.setError("password", { type: "manual", message: errorMessage });
               break;
           default:
               // Check Firestore errors? (Less likely here)
               errorMessage = "Signup failed. Please try again.";
               break;
       }
      toast({
        title: "Signup Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Choose a username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
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
                <Input type="password" placeholder="Create a password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Confirm your password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
           {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
           Sign Up
        </Button>
      </form>
    </Form>
  );
}

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
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router
import { useState } from "react";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
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
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    console.log("Login attempt:", values); // Keep console log for debugging

    // --- Placeholder for MongoDB Authentication ---
    // Replace this with actual API call to your backend
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

    // Example success/failure (replace with actual backend response check)
    const loginSuccess = values.username !== "fail"; // Simulate failure for username 'fail'

    setIsLoading(false);

    if (loginSuccess) {
      toast({
        title: "Login Successful",
        description: `Welcome back, ${values.username}!`,
      });
      // Simulate setting auth state (replace with actual state management/token storage)
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('username', values.username);
      onSuccess(); // Call the onSuccess prop
      router.push('/lobby'); // Redirect to lobby after successful login
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid username or password.",
        variant: "destructive",
      });
       form.setError("username", { type: "manual", message: "Invalid credentials" });
       form.setError("password", { type: "manual", message: "Invalid credentials" });
    }
    // --- End Placeholder ---
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter your username" {...field} />
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

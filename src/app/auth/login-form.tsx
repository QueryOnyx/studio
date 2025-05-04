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
    form.clearErrors(); // Clear previous errors

    try {
       const response = await fetch('/api/auth/login', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           username: values.username,
           password: values.password,
         }),
       });

       const data = await response.json();

      if (response.ok) {
        toast({
          title: "Login Successful",
          description: `Welcome back, ${values.username}!`,
        });
        // Store auth state (replace with proper session/token management later)
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', values.username);
        // Optionally store other user details if needed by the app immediately
        // localStorage.setItem('userId', data.user._id); // Example if ID is returned

        onSuccess(); // Call the onSuccess prop (might be used for UI updates)
        router.push('/lobby'); // Redirect to lobby after successful login
      } else {
        // Handle login failure
        toast({
          title: "Login Failed",
          description: data.message || "Invalid username or password.",
          variant: "destructive",
        });
        // Set errors on both fields for generic invalid credentials message
        form.setError("username", { type: "manual", message: " " }); // Empty message to just show red border
        form.setError("password", { type: "manual", message: data.message || "Invalid username or password." });
      }
    } catch (error) {
        console.error("Login Network Error:", error);
        toast({
            title: "Login Failed",
            description: "Could not connect to the server. Please try again later.",
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

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
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.username,
          email: values.email,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Signup Successful",
          description: "Your account has been created. Please log in.",
        });
        onSuccess(); // Switch to login tab
      } else {
        // Handle specific errors from the API
        if (response.status === 409) { // Conflict (user exists)
           toast({
             title: "Signup Failed",
             description: data.message || "Username or email might already be taken.",
             variant: "destructive",
           });
           if (data.message?.toLowerCase().includes('username')) {
                form.setError("username", { type: "manual", message: data.message });
           } else if (data.message?.toLowerCase().includes('email')) {
                form.setError("email", { type: "manual", message: data.message });
           } else {
                 form.setError("username", { type: "manual", message: "Username or email might be taken" });
           }
        } else if (response.status === 400) { // Bad Request (validation)
             toast({
                title: "Signup Failed",
                description: data.message || "Please check your input.",
                variant: "destructive",
            });
            // Optionally display specific field errors from data.errors
             if (data.errors) {
                 data.errors.forEach((err: any) => {
                    if(err.path && err.path.length > 0){
                        form.setError(err.path[0] as keyof z.infer<typeof formSchema>, { type: 'manual', message: err.message });
                    }
                 });
             }
        }
        else {
          toast({
            title: "Signup Failed",
            description: data.message || "An unexpected error occurred.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Signup Network Error:", error);
      toast({
        title: "Signup Failed",
        description: "Could not connect to the server. Please try again later.",
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

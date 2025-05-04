'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LoginForm from './login-form';
import SignupForm from './signup-form';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('login');

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>Access your Triad Trials account.</CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm onSuccess={() => setActiveTab('login')} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>Create a new account to play.</CardDescription>
            </CardHeader>
            <CardContent>
              <SignupForm onSuccess={() => setActiveTab('login')} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

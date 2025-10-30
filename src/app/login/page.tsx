'use client';

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';
import { FirebaseClientProvider } from "@/firebase";

export default function LoginPage() {
  return (
    <FirebaseClientProvider>
      <main className="relative flex min-h-screen items-center justify-center p-4">
        <Image 
          src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzODE4MDB8MHwxfGFsbHx8fHx8fHx8fDE3MjM1ODk5MDZ8&ixlib=rb-4.0.3&q=80&w=1080"
          alt="Escritório moderno"
          fill
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          data-ai-hint="modern office"
        />
        <div className="absolute inset-0 -z-10 bg-black/60" />
        <div className="w-full max-w-5xl">
          <Card className="w-full bg-background/90 backdrop-blur-sm">
            <div className="grid items-stretch md:grid-cols-2">
              <CardHeader className="p-8 md:p-10 border-b md:border-b-0 md:border-r border-border">
                <div className="flex items-center gap-4 md:gap-6 justify-center md:justify-start">
                  <Image src="/image/BMV.png" alt="BMV Logo" width={64} height={64} className="rounded-md" />
                  <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-black">Nexus</h1>
                </div>
              </CardHeader>
              <CardContent className="p-8 md:p-10">
                <div className="mx-auto w-full max-w-sm space-y-4">
                  <div className="text-center md:text-left">
                    <CardTitle className="font-headline text-3xl">Bem-vindo</CardTitle>
                    <CardDescription>Insira suas credenciais para acessar seu painel.</CardDescription>
                  </div>
                  <LoginForm />
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </main>
    </FirebaseClientProvider>
  );
}

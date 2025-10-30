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
        <div className="flex w-full max-w-6xl flex-col items-center justify-center gap-16 md:flex-row">
          <div className="w-full max-w-md text-center md:text-left">
            <div className="mb-4 flex items-center justify-center gap-3 md:justify-start">
              <Image src="/image/BMV.png" alt="BMV Logo" width={60} height={60} className="text-primary" />
              <h1 className="font-headline text-4xl font-bold tracking-tight text-white">
                BMV Nexus
              </h1>
            </div>
            {/* O texto de marketing foi removido conforme solicitado */}
          </div>
          <Card className="w-full max-w-sm shrink-0 bg-background/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Bem-vindo de Volta</CardTitle>
              <CardDescription>Insira suas credenciais para acessar seu painel.</CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        </div>
      </main>
    </FirebaseClientProvider>
  );
}

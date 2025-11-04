'use client';

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { ShieldAlert } from "lucide-react";

export default function LoginPage() {
  return (
    <FirebaseClientProvider>
      <main className="relative flex min-h-screen items-center justify-center p-4">
        <Image
          src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzODE4MDB8MHwxfGFsbHx8fHx8fHx8fDE3MjM2OTIzNTV8&ixlib=rb-4.0.3&q=80&w=1080"
          alt="Escritório moderno e colaborativo"
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 100vw"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          data-ai-hint="modern office"
        />
        <div className="absolute inset-0 -z-10 bg-black/60" />
        <div className="w-full max-w-5xl">
          <Card className="w-full bg-background/85 backdrop-blur-[2px] md:backdrop-blur-sm">
            <div className="grid items-stretch md:grid-cols-2">
              <CardHeader className="flex items-center justify-center p-10 md:p-10 border-b md:border-b-0 md:border-r border-border">
                <div className="relative flex flex-col items-center justify-center gap-4 text-center overflow-hidden">
                  <div className="flex items-center justify-center gap-4">
                     <Image src="/image/BMV.png" alt="BMV Logo" width={200} height={200} className="rounded-md z-10" />
                     <h1 className="font-headline text-5xl md:text-6xl font-bold tracking-tight text-black animate-slide-in-from-left delay-1000">Nexus</h1>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 md:p-10">
                <div className="mx-auto w-full max-w-sm space-y-4">
                  <div className="text-center md:text-left">
                    <CardTitle className="font-headline text-3xl">Bem-vindo</CardTitle>
                    <CardDescription>Insira suas credenciais para acessar seu painel.</CardDescription>
                  </div>
                  <LoginForm />
                  <div className="pt-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <ShieldAlert className="h-4 w-4"/>
                    <div>
                        <p>Uso interno. As informações contidas neste sistema são confidenciais.</p>
                    </div>
                </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </main>
    </FirebaseClientProvider>
  );
}

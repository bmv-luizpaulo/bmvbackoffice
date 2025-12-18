'use client';

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { ShieldAlert } from "lucide-react";

export default function LoginPage() {
  return (
    <FirebaseClientProvider>
      <main className="relative flex min-h-screen items-center justify-center bg-background p-4">
        <Image
          src="/image/Tech_37.jpg"
          alt="Tecnologia e negócios"
          fill
          sizes="100vw"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          data-ai-hint="technology business"
        />
        <div className="absolute inset-0 -z-10 bg-black/60" />
        <div className="w-full max-w-5xl">
          <Card className="w-full bg-background/90 backdrop-blur-sm md:grid md:grid-cols-2">
            <div className="flex items-center justify-center p-6 md:p-10 border-b md:border-b-0 md:border-r">
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                    <Image src="/image/BMV.png" alt="SGI Logo" width={200} height={200} className="rounded-md" />
                    <h1 className="font-headline text-5xl md:text-6xl font-bold tracking-tight text-foreground">SGI</h1>
                </div>
            </div>
              <div className="flex flex-col justify-center p-6 md:p-10">
                <div className="mx-auto w-full max-w-sm space-y-4">
                  <div className="text-center md:text-left">
                    <CardTitle className="font-headline text-3xl">Bem-vindo</CardTitle>
                    <CardDescription>Insira suas credenciais para acessar seu painel.</CardDescription>
                  </div>
                  <LoginForm />
                  <div className="pt-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <ShieldAlert className="h-4 w-4"/>
                    <p>Uso interno. As informações contidas neste sistema são confidenciais.</p>
                </div>
                </div>
              </div>
          </Card>
        </div>
      </main>
    </FirebaseClientProvider>
  );
}

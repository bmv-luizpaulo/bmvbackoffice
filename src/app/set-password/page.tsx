'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FirebaseClientProvider, useAuth } from '@/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from 'next/image';
import { Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import { Suspense } from 'react';

const formSchema = z.object({
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não correspondem.",
  path: ["confirmPassword"],
});

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = React.useState(true);
  const [isValidCode, setIsValidCode] = React.useState(false);
  const [email, setEmail] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const oobCode = searchParams.get('oobCode');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  React.useEffect(() => {
    async function verifyCode() {
      if (!oobCode || !auth) {
        setIsValidCode(false);
        setIsLoading(false);
        return;
      }
      try {
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
        setIsValidCode(true);
      } catch (error) {
        console.error("Código inválido ou expirado:", error);
        toast({
          variant: "destructive",
          title: "Link Inválido",
          description: "Este link para definir a senha é inválido ou já expirou. Peça um novo link ao seu gestor.",
        });
        setIsValidCode(false);
      } finally {
        setIsLoading(false);
      }
    }
    verifyCode();
  }, [oobCode, auth, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!oobCode || !auth) return;
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, values.password);
      toast({
        title: "Senha Definida com Sucesso!",
        description: "Você já pode fazer login com sua nova senha.",
      });
      router.push('/login');
    } catch (error) {
      console.error("Erro ao definir senha:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Definir Senha",
        description: "Ocorreu um erro. O link pode ter expirado. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md bg-background/90 backdrop-blur-sm">
      <CardHeader className="text-center">
        <Image src="/image/BMV.png" alt="NEXUS SGI Logo" width={100} height={100} className="mx-auto mb-4" />
        <CardTitle className="font-headline text-3xl">
          {isLoading ? 'Verificando...' : isValidCode ? 'Defina sua Senha' : 'Link Inválido'}
        </CardTitle>
        <CardDescription>
          {isLoading ? 'Aguarde enquanto validamos seu link de acesso.' : isValidCode ? `Crie uma senha de acesso para a conta ${email}.` : 'Este link é inválido ou expirou.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!isLoading && isValidCode && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Definir Senha e Entrar
              </Button>
            </form>
          </Form>
        )}
        {!isLoading && !isValidCode && (
          <div className="flex flex-col items-center text-center text-destructive">
            <ShieldX className="h-16 w-16" />
            <p className="mt-4">Por favor, contate seu gestor e solicite um novo link de acesso.</p>
            <Button variant="link" onClick={() => router.push('/login')} className="mt-4">Voltar para o Login</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SetPasswordPageContent() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <Image
        src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzODE4MDB8MHwxfGFsbHx8fHx8fHx8fDE3MjM2OTIzNTV8&ixlib=rb-4.0.3&q=80&w=1080"
        alt="Escritório moderno e colaborativo"
        fill
        sizes="100vw"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        data-ai-hint="modern office"
      />
      <div className="absolute inset-0 -z-10 bg-black/60" />
      <SetPasswordForm />
    </main>
  );
}

export default function SetPasswordPage() {
  return (
    <FirebaseClientProvider>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin"/></div>}>
        <SetPasswordPageContent />
      </Suspense>
    </FirebaseClientProvider>
  );
}

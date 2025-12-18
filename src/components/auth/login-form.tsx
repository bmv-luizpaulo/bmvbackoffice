'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "@/firebase";

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
  email: z.string().email({
    message: "Por favor, insira um endereço de e-mail válido.",
  }),
  password: z.string().min(6, {
    message: "A senha deve ter pelo menos 6 caracteres.",
  }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Login Bem-sucedido",
        description: "Bem-vindo de volta! Redirecionando para o painel.",
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Falha no login:", error);
      let description = "Ocorreu um erro durante o login.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "Credenciais inválidas. Por favor, verifique seu e-mail e senha.";
      }
      toast({
        variant: "destructive",
        title: "Falha no Login",
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">E-mail</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="seu@email.com"
                      type="email"
                      autoComplete="email"
                      className={`h-11 rounded-lg border border-gray-300 bg-white/90 text-gray-800 placeholder-gray-400 focus:border-[#3A452D] focus:ring-2 focus:ring-[#3A452D]/30 focus:ring-offset-1 transition-all duration-200 ${field.value ? 'border-[#3A452D]' : ''}`}
                      style={{
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                      }}
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium text-gray-700">Senha</FormLabel>
                  <a
                    href="/esqueci-senha"
                    className="text-xs font-medium text-[#3A452D] hover:text-[#4a5a3a] hover:underline transition-colors duration-200"
                    style={{
                      textUnderlineOffset: '2px',
                      textDecorationThickness: '1px'
                    }}
                  >
                    Esqueceu sua senha?
                  </a>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="••••••"
                      type="password"
                      autoComplete="current-password"
                      className={`h-11 rounded-lg border border-gray-300 bg-white/90 text-gray-800 placeholder-gray-400 focus:border-[#3A452D] focus:ring-2 focus:ring-[#3A452D]/30 focus:ring-offset-1 transition-all duration-200 ${field.value ? 'border-[#3A452D]' : ''}`}
                      style={{
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                      }}
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />
        </div>
        <Button 
          type="submit" 
          className="w-full h-11 rounded-lg bg-[#3A452D] hover:bg-[#4a5a3a] text-white font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          style={{
            backgroundColor: '#3A452D', // Verde BMV
            '--tw-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            '--tw-shadow-colored': '0 4px 6px -1px var(--tw-shadow-color), 0 2px 4px -1px var(--tw-shadow-color)',
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            'Acessar o sistema'
          )}
        </Button>
      </form>
    </Form>
  );
}

'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { updatePassword } from "firebase/auth";
import { Loader2 } from "lucide-react";

const passwordFormSchema = z.object({
  newPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "As senhas não correspondem.",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export function PasswordSettings() {
  const auth = useAuth();
  const { toast } = useToast();

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const { isSubmitting, isDirty } = form.formState;

  async function onSubmit(data: PasswordFormValues) {
    if (!auth.currentUser) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Nenhum usuário autenticado.' });
        return;
    }
    try {
      await updatePassword(auth.currentUser, data.newPassword);
      toast({
        title: "Senha Atualizada",
        description: "Sua senha foi alterada com sucesso.",
      });
      form.reset();
    } catch (error: any) {
      console.error("Error updating password:", error);
      let description = "Ocorreu um erro ao atualizar sua senha. Tente fazer login novamente e repita a operação.";
      if (error.code === 'auth/requires-recent-login') {
        description = "Esta operação é sensível e requer autenticação recente. Faça login novamente antes de tentar alterar a senha.";
      }
      toast({
        variant: "destructive",
        title: "Erro ao Atualizar Senha",
        description: description,
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Senha</CardTitle>
            <CardDescription>
              Altere sua senha de acesso. Use uma senha forte para manter sua conta segura.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
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
                  <FormLabel>Confirmar Nova Senha</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Alterar Senha
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

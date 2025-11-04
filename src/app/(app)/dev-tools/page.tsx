'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hammer, BellPlus, Send } from "lucide-react";
import { useNotifications } from '@/components/notifications/notifications-provider';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const notificationSchema = z.object({
    title: z.string().min(1, "O título é obrigatório."),
    message: z.string().min(1, "A mensagem é obrigatória."),
    link: z.string().url("O link deve ser uma URL válida."),
});


export default function DevToolsPage() {
    const { createNotification } = useNotifications();
    const { user } = useUser();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof notificationSchema>>({
        resolver: zodResolver(notificationSchema),
        defaultValues: {
            title: "Notificação de Teste",
            message: "Esta é uma mensagem de teste gerada pelas ferramentas de desenvolvedor.",
            link: "/dashboard",
        }
    });

    const onSubmit = (values: z.infer<typeof notificationSchema>) => {
        if (!user) {
            toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado." });
            return;
        }
        createNotification(user.uid, values);
        toast({ title: "Notificação Enviada", description: "Uma notificação de teste foi enviada para você." });
    };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <Hammer className="h-8 w-8 text-primary" />
          Ferramentas de Desenvolvimento
        </h1>
        <p className="text-muted-foreground">
          Recursos e utilitários exclusivos para desenvolvedores.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellPlus className="h-5 w-5" />
            Simulador de Notificações
          </CardTitle>
          <CardDescription>
            Crie e envie notificações de teste para o usuário atual.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Título</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mensagem</FormLabel>
                                <FormControl><Textarea {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="link"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Link</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex justify-end">
                        <Button type="submit">
                            <Send className="mr-2 h-4 w-4"/>
                            Enviar Notificação de Teste
                        </Button>
                    </div>
                </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  );
}

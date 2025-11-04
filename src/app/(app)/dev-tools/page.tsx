'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hammer, BellPlus, Send, Bot, Loader2, Bug } from "lucide-react";
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
import { getSuggestedFollowUps } from '@/ai/flows/ai-suggested-follow-ups';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const notificationSchema = z.object({
    title: z.string().min(1, "O título é obrigatório."),
    message: z.string().min(1, "A mensagem é obrigatória."),
    link: z.string().url("O link deve ser uma URL válida."),
});

const aiFollowUpSchema = z.object({
  opportunityDetails: z.string().min(1, "Os detalhes são obrigatórios."),
  currentPipelineStage: z.string().min(1, "O estágio é obrigatório."),
  pastFollowUpActions: z.string().min(1, "As ações são obrigatórias."),
});

function TestErrorGenerator() {
    const [shouldThrow, setShouldThrow] = React.useState(false);

    if (shouldThrow) {
        throw new Error("Este é um erro de teste gerado intencionalmente para verificar o Error Boundary.");
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <Bug className="h-5 w-5" />
                    Gerador de Erro de Teste
                </CardTitle>
                <CardDescription>
                    Clique no botão para disparar um erro de renderização e testar o Error Boundary global.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant="destructive" onClick={() => setShouldThrow(true)}>
                    Disparar Erro de Teste
                </Button>
            </CardContent>
        </Card>
    );
}


export default function DevToolsPage() {
    const { createNotification } = useNotifications();
    const { user } = useUser();
    const { toast } = useToast();
    
    const [aiSuggestions, setAiSuggestions] = React.useState<{ suggestedActions: string[], reasoning: string } | null>(null);
    const [isAiLoading, setIsAiLoading] = React.useState(false);

    const notificationForm = useForm<z.infer<typeof notificationSchema>>({
        resolver: zodResolver(notificationSchema),
        defaultValues: {
            title: "Notificação de Teste",
            message: "Esta é uma mensagem de teste gerada pelas ferramentas de desenvolvedor.",
            link: "/dashboard",
        }
    });
    
    const aiFollowUpForm = useForm<z.infer<typeof aiFollowUpSchema>>({
        resolver: zodResolver(aiFollowUpSchema),
        defaultValues: {
            opportunityDetails: "Cliente potencial de grande porte, demonstrou interesse em nossa solução de nuvem. Último contato há 2 semanas.",
            currentPipelineStage: "Qualificação",
            pastFollowUpActions: "E-mail de introdução enviado. Sem resposta.",
        }
    });

    const onNotificationSubmit = (values: z.infer<typeof notificationSchema>) => {
        if (!user) {
            toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado." });
            return;
        }
        createNotification(user.uid, values);
        toast({ title: "Notificação Enviada", description: "Uma notificação de teste foi enviada para você." });
    };

    const onAiFollowUpSubmit = async (values: z.infer<typeof aiFollowUpSchema>) => {
        setIsAiLoading(true);
        setAiSuggestions(null);
        try {
            const result = await getSuggestedFollowUps(values);
            setAiSuggestions(result);
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na IA", description: "Não foi possível gerar sugestões." });
        } finally {
            setIsAiLoading(false);
        }
    }


  if (process.env.NODE_ENV !== 'development') {
    return (
        <div className="space-y-6">
            <h1 className="font-headline text-3xl font-bold tracking-tight">Acesso Negado</h1>
            <p className="text-muted-foreground">Esta página está disponível apenas em ambiente de desenvolvimento.</p>
        </div>
    )
  }

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <Form {...notificationForm}>
                    <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-4">
                        <FormField control={notificationForm.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={notificationForm.control} name="message" render={({ field }) => (
                            <FormItem><FormLabel>Mensagem</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={notificationForm.control} name="link" render={({ field }) => (
                            <FormItem><FormLabel>Link</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <div className="flex justify-end">
                            <Button type="submit"><Send className="mr-2 h-4 w-4"/>Enviar Notificação</Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
          </Card>

           <div className="space-y-6">
                <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        Testador de Sugestões de IA
                    </CardTitle>
                    <CardDescription>
                        Teste o fluxo de IA para gerar sugestões de acompanhamento de vendas.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...aiFollowUpForm}>
                            <form onSubmit={aiFollowUpForm.handleSubmit(onAiFollowUpSubmit)} className="space-y-4">
                                <FormField control={aiFollowUpForm.control} name="opportunityDetails" render={({ field }) => (
                                    <FormItem><FormLabel>Detalhes da Oportunidade</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={aiFollowUpForm.control} name="currentPipelineStage" render={({ field }) => (
                                    <FormItem><FormLabel>Estágio do Pipeline</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={aiFollowUpForm.control} name="pastFollowUpActions" render={({ field }) => (
                                    <FormItem><FormLabel>Ações Anteriores</FormLabel><FormControl><Textarea {...field} rows={2}/></FormControl><FormMessage /></FormItem>
                                )}/>

                                 {aiSuggestions && (
                                    <Alert>
                                        <AlertTitle className="font-bold">Sugestões Geradas</AlertTitle>
                                        <AlertDescription>
                                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                                {aiSuggestions.suggestedActions.map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                            <p className="mt-2 text-xs text-muted-foreground italic">{aiSuggestions.reasoning}</p>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isAiLoading}>
                                        {isAiLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Gerar Sugestões
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <TestErrorGenerator />
           </div>
      </div>
    </div>
  );
}

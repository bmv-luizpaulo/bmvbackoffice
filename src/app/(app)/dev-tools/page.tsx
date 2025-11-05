'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bug, BellPlus, Send, Bot, Loader2, Flag, RefreshCcw, Link2, Copy } from "lucide-react";
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
import { useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ErrorLogViewer } from '@/components/dev-tools/error-log-viewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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


export default function DevToolsPage() {
    const { createNotification } = useNotifications();
    const { user } = useUser();
    const { toast } = useToast();
    const firestore = useFirestore();
    
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

  // Feature Flags
  const [flags, setFlags] = React.useState<Record<string, boolean>>({});
  const [isLoadingFlags, setIsLoadingFlags] = React.useState(false);
  const [newFlagName, setNewFlagName] = React.useState("");
  const [flagsFilter, setFlagsFilter] = React.useState("");

  const loadFlags = React.useCallback(async () => {
    if (!firestore) return;
    setIsLoadingFlags(true);
    try {
      const ref = doc(firestore, 'developerTools', 'featureFlags');
      const snap = await getDoc(ref);
      const data = snap.exists() ? (snap.data() as any) : {};
      setFlags(data);
    } finally {
      setIsLoadingFlags(false);
    }
  }, [firestore]);

  React.useEffect(() => { loadFlags(); }, [loadFlags]);

  const toggleFlag = async (key: string) => {
    if (!firestore) return;
    const updated = { ...flags, [key]: !flags[key] };
    setFlags(updated);
    const ref = doc(firestore, 'developerTools', 'featureFlags');
    await setDoc(ref, updated, { merge: false });
  };

  const addFlag = async () => {
    if (!firestore || !newFlagName.trim()) return;
    if (flags.hasOwnProperty(newFlagName)) {
      toast({ title: 'Flag já existe', variant: 'destructive' });
      return;
    }
    const updated = { ...flags, [newFlagName]: false };
    setFlags(updated);
    setNewFlagName("");
    const ref = doc(firestore, 'developerTools', 'featureFlags');
    await setDoc(ref, updated, { merge: false });
  };

  // Cache Cleaner
  const [isClearingCache, setIsClearingCache] = React.useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = React.useState(false);
  const clearCaches = async () => {
    setIsClearingCache(true);
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('indexedDB' in window) {
        const dbs = ['firebaseLocalStorageDb','firebase-installations-database','firebase-messaging-database'];
        dbs.forEach(name => { try { indexedDB.deleteDatabase(name); } catch {} });
      }
      toast({ title: 'Caches limpos', description: 'Limpeza concluída. Recarregue a página.' });
    } catch {
      toast({ variant: 'destructive', title: 'Falha ao limpar caches' });
    } finally {
      setIsClearingCache(false);
      setConfirmClearOpen(false);
    }
  };

  // Webhook Tester
  const webhookSchema = z.object({ url: z.string().url(), method: z.enum(['GET','POST','PUT','PATCH','DELETE']), body: z.string().optional() });
  const webhookForm = useForm<z.infer<typeof webhookSchema>>({ resolver: zodResolver(webhookSchema), defaultValues: { url: 'https://httpbin.org/post', method: 'POST', body: '{"hello":"world"}' } });
  const [webhookResponse, setWebhookResponse] = React.useState<{status:number, text:string} | null>(null);
  const onWebhookSubmit = async (values: z.infer<typeof webhookSchema>) => {
    setWebhookResponse(null);
    try {
      const init: RequestInit = { method: values.method };
      if (values.method !== 'GET' && values.body) { init.headers = { 'Content-Type': 'application/json' }; init.body = values.body; }
      const res = await fetch(values.url, init);
      const text = await res.text();
      setWebhookResponse({ status: res.status, text: text.slice(0, 2000) });
    } catch {
      toast({ variant: 'destructive', title: 'Falha ao chamar webhook' });
    }
  };
  const copyWebhookResponse = async () => {
    if (!webhookResponse) return;
    try {
      await navigator.clipboard.writeText(webhookResponse.text);
      toast({ title: 'Copiado', description: 'Resposta copiada para a área de transferência.' });
    } catch {}
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bug className="h-8 w-8 text-primary" />
          Ferramentas de Desenvolvimento
        </h1>
        <p className="text-muted-foreground">
          Recursos e utilitários exclusivos para desenvolvedores.
        </p>
      </header>
        
       <Card>
        <CardHeader>
          <CardTitle>Monitor de Erros</CardTitle>
          <CardDescription>
            Visualize os erros de cliente que foram capturados e registrados no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="unresolved">
                <TabsList>
                    <TabsTrigger value="unresolved">Não Resolvidos</TabsTrigger>
                    <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
                </TabsList>
                <TabsContent value="unresolved">
                    <ErrorLogViewer filterResolved={false} />
                </TabsContent>
                <TabsContent value="resolved">
                    <ErrorLogViewer filterResolved={true} />
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>

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

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Flag className="h-5 w-5"/>Feature Flags</CardTitle>
                        <CardDescription>Gerencie flags de funcionalidades salvas no Firestore.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                            <Input placeholder="nomeDaFlag" value={newFlagName} onChange={(e)=>setNewFlagName(e.target.value)} />
                            <div className="flex gap-2">
                              <Button type="button" onClick={addFlag}>Adicionar</Button>
                              <Button type="button" variant="outline" onClick={loadFlags} disabled={isLoadingFlags}>Recarregar</Button>
                            </div>
                        </div>
                        <div className="mb-3 flex items-center gap-2">
                           <Input placeholder="Filtrar flags..." value={flagsFilter} onChange={(e)=>setFlagsFilter(e.target.value)} className="max-w-sm" />
                           <span className="text-sm text-muted-foreground">{Object.keys(flags).length} total</span>
                        </div>
                        <div className="space-y-1 divide-y rounded-md border">
                           {Object.keys(flags).length === 0 && <p className="text-sm text-muted-foreground p-3">Nenhuma flag cadastrada.</p>}
                           {Object.entries(flags)
                             .filter(([k]) => k.toLowerCase().includes(flagsFilter.toLowerCase()))
                             .sort(([a],[b]) => a.localeCompare(b))
                             .map(([k,v]) => (
                             <div key={k} className="flex items-center justify-between p-2">
                                <span className="font-mono text-sm truncate pr-2" title={k}>{k}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{v ? 'Ativada' : 'Desativada'}</span>
                                  <Switch checked={!!v} onCheckedChange={() => toggleFlag(k)} />
                                </div>
                             </div>
                           ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><RefreshCcw className="h-5 w-5"/>Limpar Caches do Cliente</CardTitle>
                        <CardDescription>Limpa localStorage, sessionStorage, Cache API e bancos IndexedDB comuns.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
                          <Button type="button" onClick={()=>setConfirmClearOpen(true)} disabled={isClearingCache}>
                              {isClearingCache && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                              Executar Limpeza
                          </Button>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirmar limpeza</DialogTitle>
                              <DialogDescription>Isso apagará caches locais desta aplicação no navegador. Deseja continuar?</DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={()=>setConfirmClearOpen(false)}>Cancelar</Button>
                              <Button onClick={clearCaches} disabled={isClearingCache}>
                                {isClearingCache && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Confirmar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5"/>Testador de Webhook</CardTitle>
                        <CardDescription>Dispare requisições HTTP e veja a resposta.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...webhookForm}>
                            <form onSubmit={webhookForm.handleSubmit(onWebhookSubmit)} className="space-y-3">
                                <FormField control={webhookForm.control} name="url" render={({ field }) => (
                                  <FormItem><FormLabel>URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={webhookForm.control} name="method" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Método</FormLabel>
                                    <FormControl>
                                      <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-5 gap-2">
                                        {['GET','POST','PUT','PATCH','DELETE'].map(m => (
                                          <div key={m} className="flex items-center space-x-2">
                                            <RadioGroupItem value={m} id={`m-${m}`} />
                                            <label htmlFor={`m-${m}`} className="text-sm">{m}</label>
                                          </div>
                                        ))}
                                      </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}/>
                                <FormField control={webhookForm.control} name="body" render={({ field }) => (
                                  <FormItem><FormLabel>Body (JSON)</FormLabel><FormControl><Textarea rows={6} {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <div className="flex justify-end gap-2">
                                  <Button type="button" variant="outline" onClick={()=>{ setWebhookResponse(null); webhookForm.reset(); }}>Limpar</Button>
                                  <Button type="submit">Enviar</Button>
                                </div>
                            </form>
                        </Form>
                        {webhookResponse && (
                          <Alert className="mt-4">
                            <AlertTitle className="font-bold flex items-center justify-between">
                              <span>Status: {webhookResponse.status}</span>
                              <Button size="sm" variant="outline" onClick={copyWebhookResponse}><Copy className="h-4 w-4 mr-1"/>Copiar</Button>
                            </AlertTitle>
                            <AlertDescription>
                              <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-64">{webhookResponse.text}</pre>
                            </AlertDescription>
                          </Alert>
                        )}
                    </CardContent>
                </Card>

           </div>
      </div>
    </div>
  );
}

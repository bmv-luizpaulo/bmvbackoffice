
'use client';

import * as React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useUser, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import type { Task, Project, User as UserType, Stage, Meeting } from '@/lib/types';
import { collection, query, getDocs, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Loader2, ListPlus, Bot, Wand2 } from 'lucide-react';
import { useNotifications } from '@/components/notifications/notifications-provider';
import { TaskFormFields } from '@/components/tasks/task-form-fields';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { parseMeetingDetailsAction } from '@/lib/actions';

const formSchema = z.object({
  taskType: z.enum(['task', 'meeting']).default('task'),
  name: z.string().min(1, "O nome é obrigatório."),
  description: z.string().optional(),
  projectId: z.string().optional(),
  assignee: z.string().optional(),
  dueDate: z.date().optional(),
  meetLink: z.string().url("URL inválida.").optional().or(z.literal('')),
  participantIds: z.array(z.string()).optional(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(['diaria', 'semanal', 'mensal']).optional(),
  recurrenceEndDate: z.date().optional(),
});

export default function NewTaskPage() {
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { createNotification } = useNotifications();
  const searchParams = useSearchParams();

  const [isParsing, setIsParsing] = React.useState(false);
  const [meetingPaste, setMeetingPaste] = React.useState("");

  const projectsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'projects') : null, [firestore]);
  const { data: projectsData, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<UserType>(usersQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "", taskType: 'task', participantIds: [] },
  });
  
  React.useEffect(() => {
    const type = searchParams.get('type') as 'task' | 'meeting' | null;
    if (type) {
      form.setValue('taskType', type);
    }
  }, [searchParams, form]);


  const { isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !authUser) return;

    try {
        if (values.taskType === 'meeting') {
            const meetingData: Omit<Meeting, 'id'> = {
                name: values.name,
                description: values.description || '',
                dueDate: values.dueDate?.toISOString() || new Date().toISOString(),
                meetLink: values.meetLink,
                participantIds: values.participantIds || [],
                isRecurring: values.isRecurring,
                recurrenceFrequency: values.isRecurring ? values.recurrenceFrequency : undefined,
                recurrenceEndDate: values.isRecurring ? values.recurrenceEndDate?.toISOString() : undefined,
                createdAt: serverTimestamp(),
            };
            await addDocumentNonBlocking(collection(firestore, 'meetings'), meetingData);
            toast({ title: "Reunião Criada", description: "Sua nova reunião foi adicionada." });
        } else {
            let stageId: string | undefined = undefined;
            if (values.projectId) {
                const stagesCollection = collection(firestore, 'projects', values.projectId, 'stages');
                const stagesSnapshot = await getDocs(stagesCollection);
                
                if (stagesSnapshot.empty) {
                    toast({ variant: 'destructive', title: "Erro de Configuração", description: "O projeto selecionado não possui etapas (stages) configuradas. Adicione etapas ao projeto antes de criar tarefas." });
                    return;
                }
                const stages = stagesSnapshot.docs.map(d => ({...d.data(), id: d.id}) as Stage).sort((a,b) => a.order - b.order);
                stageId = stages[0]?.id;
            }

            const { assignee, ...rest } = values;
            let assigneeId: string | undefined;
            let teamId: string | undefined;

            if (assignee?.startsWith('user-')) assigneeId = assignee.replace('user-', '');
            if (assignee?.startsWith('team-')) teamId = assignee.replace('team-', '');

            const taskData: Omit<Task, 'id'> = {
                name: rest.name,
                description: rest.description || '',
                projectId: values.projectId || undefined,
                assigneeId: assigneeId,
                teamId: teamId,
                stageId: stageId,
                isCompleted: false,
                createdAt: serverTimestamp(),
                dueDate: values.dueDate?.toISOString(),
                isRecurring: values.isRecurring,
                recurrenceFrequency: values.isRecurring ? values.recurrenceFrequency : undefined,
                recurrenceEndDate: values.isRecurring ? values.recurrenceEndDate?.toISOString() : undefined,
            };

            const docRef = await addDocumentNonBlocking(collection(firestore, 'tasks'), taskData);

            if (taskData.assigneeId) {
                const project = projectsData?.find(p => p.id === values.projectId);
                createNotification(taskData.assigneeId, {
                    title: 'Nova Tarefa Atribuída',
                    message: `Você foi atribuído à tarefa "${values.name}"${project ? ` no projeto "${project.name}"` : ''}.`,
                    link: `/projects?projectId=${values.projectId}&taskId=${docRef.id}`
                });
            }

            toast({ title: "Tarefa Criada", description: "Sua nova tarefa foi adicionada." });
        }

        router.push('/agenda/tarefas');

    } catch (error) {
      console.error("Erro ao criar item:", error);
      toast({ variant: 'destructive', title: "Erro", description: "Não foi possível criar o item." });
    }
  }

  const handleParseMeeting = async () => {
    if (!meetingPaste.trim()) return;
    setIsParsing(true);
    try {
        const result = await parseMeetingDetailsAction(meetingPaste);
        if (result.success && result.data) {
            const { name, startDate, meetLink } = result.data;
            form.setValue('taskType', 'meeting');
            if (name) form.setValue('name', name);
            if (startDate) form.setValue('dueDate', new Date(startDate));
            if (meetLink) form.setValue('meetLink', meetLink);
            toast({ title: "Dados da reunião extraídos com sucesso!" });
        } else {
            throw new Error(result.error || "A IA não conseguiu extrair os detalhes.");
        }
    } catch(e: any) {
        toast({ title: "Erro na Análise", description: e.message, variant: 'destructive' });
    } finally {
        setIsParsing(false);
    }
  }

  const isLoading = isLoadingProjects || isLoadingUsers;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
            <ListPlus className="h-8 w-8 text-primary"/>
            Criar Novo Item
        </h1>
        <p className="text-muted-foreground">
          Preencha os detalhes abaixo para adicionar uma nova tarefa ou reunião.
        </p>
      </header>
       <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Detalhes do Item</CardTitle>
          <CardDescription>
            Selecione o tipo de item e preencha as informações.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible className="w-full mb-6">
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <div className="flex items-center gap-2 text-primary">
                            <Bot className="h-5 w-5"/>
                            <span className="font-semibold">Criar a partir de texto (com IA)</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-3">
                       <Textarea 
                         placeholder="Cole aqui o conteúdo de um convite de reunião (ex: do Google Calendar)..."
                         rows={8}
                         value={meetingPaste}
                         onChange={(e) => setMeetingPaste(e.target.value)}
                       />
                       <Button onClick={handleParseMeeting} disabled={isParsing || !meetingPaste.trim()}>
                            {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4" />}
                            Analisar e Preencher
                       </Button>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            {isLoading ? (
                <div className='flex items-center justify-center h-40'>
                    <Loader2 className='animate-spin text-primary' />
                </div>
            ) : (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                       <TaskFormFields 
                         form={form} 
                         projectsData={projectsData || []}
                         usersData={usersData || []}
                       />
                        <div className='flex justify-end'>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Criar Item
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import * as React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useUser, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import type { Task, User as UserType, Meeting } from '@/lib/types';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Loader2, ListPlus } from 'lucide-react';
import { useNotifications } from '@/components/notifications/notifications-provider';
import { TaskFormFields } from '@/components/tasks/task-form-fields';
import { useUserProjects } from '@/hooks/useUserProjects';

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
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { createNotification } = useNotifications();
  const searchParams = useSearchParams();

  const { projects: projectsData, isLoading: isLoadingProjects } = useUserProjects();
  
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<UserType>(usersQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "", taskType: 'task', participantIds: [] },
  });
  
  const itemType = (searchParams.get('type') as 'task' | 'meeting' | null) || 'task';

  React.useEffect(() => {
    form.setValue('taskType', itemType);
  }, [itemType, form]);


  const { isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !authUser) return;

    try {
        if (values.taskType === 'meeting') {
            const meetingData: Omit<Meeting, 'id'> = {
                name: values.name,
                description: values.description || '',
                dueDate: values.dueDate ? values.dueDate.toISOString() : new Date().toISOString(),
                meetLink: values.meetLink,
                participantIds: values.participantIds || [],
                isRecurring: values.isRecurring,
                recurrenceFrequency: values.isRecurring ? values.recurrenceFrequency : undefined,
                recurrenceEndDate: values.isRecurring && values.recurrenceEndDate ? values.recurrenceEndDate.toISOString() : undefined,
                createdAt: serverTimestamp(),
            };
            await addDocumentNonBlocking(collection(firestore, 'meetings'), meetingData);
            toast({ title: "Reunião Criada", description: "Sua nova reunião foi adicionada." });
        } else {
            const { assignee, ...rest } = values;
            let assigneeId: string | undefined;
            let teamId: string | undefined;

            if (assignee?.startsWith('user-')) assigneeId = assignee.replace('user-', '');
            if (assignee?.startsWith('team-')) teamId = assignee.replace('team-', '');

            const taskData: Omit<Task, 'id' | 'isCompleted'> = {
                name: rest.name,
                description: rest.description || '',
                projectId: values.projectId || undefined,
                assigneeId: assigneeId,
                teamId: teamId,
                dueDate: values.dueDate?.toISOString(),
                isRecurring: values.isRecurring,
                recurrenceFrequency: values.isRecurring ? values.recurrenceFrequency : undefined,
                recurrenceEndDate: values.isRecurring && values.recurrenceEndDate ? values.recurrenceEndDate.toISOString() : undefined,
                createdAt: serverTimestamp(),
            };

            const docRef = await addDocumentNonBlocking(collection(firestore, 'tasks'), taskData);

            if (taskData.assigneeId) {
                const project = projectsData?.find(p => p.id === values.projectId);
                createNotification(
                    taskData.assigneeId, 
                    'task_assigned', 
                    {
                        taskName: values.name,
                        projectName: project ? ` no projeto "${project.name}"` : ''
                    }
                );
            }

            toast({ title: "Tarefa Criada", description: "Sua nova tarefa foi adicionada." });
        }

        router.push('/agenda/tarefas');

    } catch (error) {
      console.error("Erro ao criar item:", error);
      toast({ variant: 'destructive', title: "Erro", description: "Não foi possível criar o item." });
    }
  }

  const isLoading = isAuthLoading || isLoadingProjects || isLoadingUsers;
  const pageTitle = itemType === 'meeting' ? 'Nova Reunião' : 'Nova Tarefa';
  const pageDescription = itemType === 'meeting' 
    ? 'Preencha os detalhes abaixo para agendar uma nova reunião.'
    : 'Preencha os detalhes abaixo para adicionar uma nova tarefa.';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
            <ListPlus className="h-8 w-8 text-primary"/>
            {pageTitle}
        </h1>
        <p className="text-muted-foreground">
          {pageDescription}
        </p>
      </header>
       <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Detalhes do Item</CardTitle>
          <CardDescription>
            { itemType === 'meeting' ? 'Preencha as informações da reunião.' : 'Preencha as informações da tarefa.' }
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                                Criar {itemType === 'meeting' ? 'Reunião' : 'Tarefa'}
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

'use client';

import * as React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useUser, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import type { Task, Project, User as UserType } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle } from 'lucide-react';
import { useNotifications } from '@/components/notifications/notifications-provider';

const formSchema = z.object({
  name: z.string().min(1, "O nome da tarefa é obrigatório."),
  description: z.string().optional(),
  projectId: z.string({ required_error: "O projeto é obrigatório." }),
  assigneeId: z.string().optional(),
});

export default function NewTaskPage() {
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { createNotification } = useNotifications();

  const projectsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'projects') : null, [firestore]);
  const { data: projectsData, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<UserType>(usersQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "" },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !authUser) return;

    try {
        const stagesCollection = collection(firestore, 'projects', values.projectId, 'stages');
        const defaultStage = (await collection(firestore, 'projects', values.projectId, 'stages').get()).docs
            .map(d => d.data())
            .find(s => s.order === 1);

        if (!defaultStage) {
            toast({ variant: 'destructive', title: "Erro", description: "O projeto selecionado não possui uma etapa inicial configurada." });
            return;
        }

        const taskData: Omit<Task, 'id'> = {
            ...values,
            projectId: values.projectId,
            stageId: defaultStage.id,
            isCompleted: false,
            description: values.description || '',
        };

        const docRef = await addDocumentNonBlocking(collection(firestore, 'projects', values.projectId, 'tasks'), taskData);

        if (values.assigneeId) {
            const project = projectsData?.find(p => p.id === values.projectId);
            createNotification(values.assigneeId, {
                title: 'Nova Tarefa Atribuída',
                message: `Você foi atribuído à tarefa "${values.name}" no projeto "${project?.name}".`,
                link: `/projects?projectId=${values.projectId}&taskId=${docRef.id}`
            });
        }

        toast({ title: "Tarefa Criada", description: "Sua nova tarefa foi adicionada ao funil." });
        router.push(`/projects`);

    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      toast({ variant: 'destructive', title: "Erro", description: "Não foi possível criar a tarefa." });
    }
  }

  const isLoading = isLoadingProjects || isLoadingUsers;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
            <PlusCircle className="h-8 w-8 text-primary"/>
            Criar Nova Tarefa
        </h1>
        <p className="text-muted-foreground">
          Preencha os detalhes abaixo para adicionar uma nova tarefa.
        </p>
      </header>
       <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Detalhes da Tarefa</CardTitle>
          <CardDescription>
            Selecione o projeto e descreva a tarefa a ser realizada.
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
                       <FormField
                            control={form.control}
                            name="projectId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Projeto</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o projeto ao qual a tarefa pertence" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {projectsData?.map(project => (
                                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nome da Tarefa</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Desenvolver a tela de autenticação" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Descrição (Opcional)</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Adicione detalhes, requisitos ou links importantes..." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="assigneeId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Atribuir a (Opcional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um responsável pela tarefa" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                     <SelectItem value="">Não atribuir</SelectItem>
                                    {usersData?.map(user => (
                                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className='flex justify-end'>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Criar Tarefa
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

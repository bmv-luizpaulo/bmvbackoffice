'use client';

import { useState, useMemo } from 'react';
import { useAuth, useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, doc, query, where } from 'firebase/firestore';
import type { Task, User, Project } from '@/lib/types';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskAgendaItem } from '@/components/agenda/task-agenda-item';
import { isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TaskAgendaPage() {
  const firestore = useFirestore();
  const { user: authUser } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string | 'all'>('all');

  const userProfileQuery = useMemoFirebase(() => firestore && authUser?.uid ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: userProfile } = useDoc<User>(userProfileQuery);
  
  const allUsersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: allUsers } = useCollection<User>(allUsersQuery);

  const tasksQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || !authUser?.uid) return null;

    const tasksCollection = collectionGroup(firestore, 'tasks');
    
    if (userProfile.role === 'Gestor') {
      if (selectedUserId === 'all') {
        return tasksCollection;
      }
      return query(tasksCollection, where('assigneeId', '==', selectedUserId));
    }
    
    return query(tasksCollection, where('assigneeId', '==', authUser.uid));
  }, [firestore, userProfile, selectedUserId, authUser]);
  const { data: tasksData, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
  
  const projectsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'projects') : null, [firestore]);
  const { data: projectsData } = useCollection<Project>(projectsQuery);

  const projectsMap = useMemo(() => new Map(projectsData?.map(p => [p.id, p])), [projectsData]);
  const usersMap = useMemo(() => new Map(allUsers?.map(u => [u.id, u])), [allUsers]);

  const tasksWithDates = useMemo(() => tasksData?.filter(t => !!t.dueDate).map(t => ({...t, dueDate: new Date(t.dueDate!)})) || [], [tasksData]);

  const selectedDayTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasksWithDates
      .filter(task => isSameDay(task.dueDate!, selectedDate))
      .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());
  }, [tasksWithDates, selectedDate]);
  
  const isGestor = userProfile?.role === 'Gestor';

  return (
    <div className="space-y-6">
      <header>
        <div className="flex justify-between items-center">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">Agenda de Tarefas</h1>
                <p className="text-muted-foreground">
                    Visualize as tarefas em um calendário e gerencie sua programação.
                </p>
            </div>
            {isGestor && (
                <div className="w-64">
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filtrar por funcionário..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Funcionários</SelectItem>
                            {allUsers?.map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
            <CardContent className="p-2 sm:p-4">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={ptBR}
                    className="p-0"
                    classNames={{
                        root: "w-full",
                        months: "w-full",
                        month: "w-full",
                        table: "w-full",
                        head_row: "w-full flex justify-around",
                        row: "w-full flex justify-around mt-2"
                    }}
                    modifiers={{
                        hasTask: tasksWithDates.map(t => t.dueDate!)
                    }}
                    modifiersClassNames={{
                        hasTask: "relative !flex items-center justify-center after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary"
                    }}
                />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Tarefas do dia</CardTitle>
                <CardDescription>
                    {selectedDate ? selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : "Selecione um dia"}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[450px] overflow-y-auto">
                {isLoadingTasks ? (
                    <p>Carregando tarefas...</p>
                ) : selectedDayTasks.length > 0 ? (
                    selectedDayTasks.map(task => (
                        <TaskAgendaItem 
                            key={task.id}
                            task={task}
                            project={projectsMap.get(task.projectId)}
                            assignee={usersMap.get(task.assigneeId || '')}
                        />
                    ))
                ) : (
                    <p className="text-muted-foreground text-sm">Nenhuma tarefa para este dia.</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

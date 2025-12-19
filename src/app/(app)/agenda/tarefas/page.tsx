
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Task, User, Project, Role, Meeting } from '@/lib/types';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskAgendaItem } from '@/components/agenda/task-agenda-item';
import { isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

export default function TaskAgendaPage() {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading } = useUser();
  const searchParams = useSearchParams();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string | 'all'>('all');

  const userProfileQuery = useMemoFirebase(() => firestore && authUser?.uid ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userProfileQuery);
  
  const roleQuery = useMemoFirebase(() => firestore && userProfile?.roleId ? doc(firestore, 'roles', userProfile.roleId) : null, [firestore, userProfile?.roleId]);
  const { data: role, isLoading: isRoleLoading } = useDoc<Role>(roleQuery);

  const isGestor = role?.permissions?.isManager || role?.permissions?.isDev;

  const allUsersQuery = useMemoFirebase(() => firestore && isGestor ? collection(firestore, 'users') : null, [firestore, isGestor]);
  const { data: allUsers } = useCollection<User>(allUsersQuery);

  const filterParam = searchParams.get('filter');
  
  useEffect(() => {
    if (filterParam === 'me' && authUser?.uid) {
      setSelectedUserId(authUser.uid);
    } else {
      setSelectedUserId('all');
    }
  }, [filterParam, authUser?.uid]);


  const tasksQuery = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    
    // If role is still loading, we can't determine the correct query yet.
    if (isRoleLoading) return null;
    
    let q = query(collection(firestore, 'tasks'));

    if (isGestor) {
      if (selectedUserId !== 'all') {
        q = query(q, where('assigneeId', '==', selectedUserId));
      }
      // Gestor can see all tasks if 'all' is selected, so no extra `where` clause.
    } else {
      // Non-gestores can only see their own tasks.
      q = query(q, where('assigneeId', '==', authUser.uid));
    }
    return q;
  }, [firestore, authUser?.uid, isGestor, isRoleLoading, selectedUserId]);

  const { data: tasksData, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
  
  const meetingsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;

    // If role is still loading, we can't determine the correct query yet.
    if (isRoleLoading) return null;

    let q = query(collection(firestore, 'meetings'));

    if (isGestor) {
      if (selectedUserId !== 'all') {
         q = query(q, where('participantIds', 'array-contains', selectedUserId));
      }
    } else {
       q = query(q, where('participantIds', 'array-contains', authUser.uid));
    }
    return q;
  }, [firestore, authUser?.uid, isGestor, isRoleLoading, selectedUserId]);

  const { data: meetingsData, isLoading: isLoadingMeetings } = useCollection<Meeting>(meetingsQuery);

  const projectsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'projects') : null, [firestore]);
  const { data: projectsData } = useCollection<Project>(projectsQuery);

  const projectsMap = useMemo(() => new Map(projectsData?.map(p => [p.id, p])), [projectsData]);
  const usersMap = useMemo(() => new Map(allUsers?.map(u => [u.id, u])), [allUsers]);

  const combinedAgendaItems = useMemo(() => {
    const tasksWithDates = tasksData
      ?.filter(t => !!t.dueDate)
      .map(t => ({...t, dueDateObj: new Date(t.dueDate!), itemType: 'task' as const })) || [];

    const meetingsWithDates = meetingsData
      ?.filter(m => !!m.dueDate)
      .map(m => ({...m, dueDateObj: new Date(m.dueDate!), itemType: 'meeting' as const })) || [];

    return [...tasksWithDates, ...meetingsWithDates];
  }, [tasksData, meetingsData]);

  const selectedDayItems = useMemo(() => {
    if (!selectedDate) return [];
    return combinedAgendaItems
      .filter(item => item.dueDateObj && isSameDay(item.dueDateObj, selectedDate))
      .sort((a, b) => a.dueDateObj!.getTime() - b.dueDateObj!.getTime());
  }, [combinedAgendaItems, selectedDate]);
  
  const isLoading = isUserLoading || isProfileLoading || isRoleLoading || isLoadingTasks || isLoadingMeetings;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-full max-w-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-[300px] w-full" />
          </div>
          <Skeleton className="h-[450px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap gap-4 justify-between items-center">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">Agenda</h1>
                <p className="text-muted-foreground">
                    Visualize suas tarefas e reuniões em um calendário e gerencie sua programação.
                </p>
            </div>
            <div className='flex items-center gap-2'>
              <Button asChild variant="outline">
                <Link href="/tasks/new?type=meeting">
                  <Plus className="h-4 w-4 mr-2"/>
                  Nova Reunião
                </Link>
              </Button>
              <Button asChild>
                <Link href="/tasks/new">
                  <Plus className="h-4 w-4 mr-2"/>
                  Nova Tarefa
                </Link>
              </Button>
            </div>
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {isGestor && (
              <div className="w-full sm:w-64">
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                          <SelectValue placeholder="Filtrar por usuário..." />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">Todos os Usuários</SelectItem>
                          {allUsers?.map(user => (
                              <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
          )}
          <Card>
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
                          hasTask: combinedAgendaItems.map(t => t.dueDateObj)
                      }}
                      modifiersClassNames={{
                          hasTask: "relative !flex items-center justify-center after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary"
                      }}
                  />
              </CardContent>
          </Card>
        </div>


        <Card>
            <CardHeader>
                <CardTitle>Agenda do dia</CardTitle>
                <CardDescription>
                    {selectedDate ? selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : "Selecione um dia"}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[450px] overflow-y-auto">
                {selectedDayItems.length > 0 ? (
                    selectedDayItems.map(item => (
                        <TaskAgendaItem 
                            key={item.id}
                            item={item}
                            project={item.itemType === 'task' ? projectsMap.get(item.projectId || '') : undefined}
                            assignee={item.itemType === 'task' ? usersMap.get(item.assigneeId || '') : undefined}
                        />
                    ))
                ) : (
                    <p className="text-muted-foreground text-sm">Nenhum item na agenda para este dia.</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

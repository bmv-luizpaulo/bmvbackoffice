
'use client';

import { useMemo } from 'react';
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Target, FolderKanban } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, or } from "firebase/firestore";
import type { Task, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import React from 'react';
import dynamic from 'next/dynamic';
import { useUserProjects } from '@/hooks/useUserProjects';

const RecentTasksCard = dynamic(() => import('@/components/dashboard/recent-tasks-card'), {
  loading: () => <Skeleton className="h-[400px]" />,
});

interface UserDashboardProps {
    user: User;
}

function UserDashboard({ user }: UserDashboardProps) {
  const firestore = useFirestore();
  const { projects: projectsData, isLoading: isLoadingProjects } = useUserProjects();

  const userTasksQuery = useMemoFirebase(() => 
    firestore && user?.id
    ? query(
        collection(firestore, 'tasks'), 
        where('assigneeId', '==', user.id)
      ) 
    : null, 
  [firestore, user?.id]);
  const { data: tasksData, isLoading: isLoadingTasks } = useCollection<Task>(userTasksQuery);
  

  const { openTasks, activeProjects } = useMemo(() => {
    const openTasksCount = tasksData?.filter(task => !task.isCompleted).length || 0;
    const activeProjectsCount = projectsData?.filter(p => p.status === 'Em execução').length || 0;
    return {
        openTasks: openTasksCount,
        activeProjects: activeProjectsCount,
    };
  }, [tasksData, projectsData]);

  const isLoading = isLoadingTasks || isLoadingProjects;
  
   return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Meu Painel</h1>
        <p className="text-muted-foreground">Suas tarefas e atividades recentes.</p>
      </header>
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <>
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </>
            ) : (
              <>
                <KpiCard 
                  title="Minhas Tarefas Pendentes" 
                  value={openTasks.toString()}
                  description="Total de tarefas atribuídas a você"
                  icon={<Target className="text-amber-500"/>}
                  href="/agenda/tarefas?filter=me"
                />
                <KpiCard 
                  title="Meus Projetos Ativos" 
                  value={activeProjects.toString()}
                  description="Projetos em que você está participando"
                  icon={<FolderKanban className="text-primary"/>}
                  href="/projetos?filter=me"
                />
              </>
            )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                 <RecentTasksCard userId={user.id} />
            </div>
            <div className="lg:col-span-1 space-y-6">
               {/* Placeholder for future cards */}
            </div>
        </div>
    </div>
  );
}

export default UserDashboard;

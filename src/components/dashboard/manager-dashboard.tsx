'use client';

import { useMemo } from 'react';
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CheckCircle, Target, FolderKanban, Award } from "lucide-react";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup } from "firebase/firestore";
import type { Project, Task, Stage, Seal } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInDays, isPast } from 'date-fns';
import React from 'react';
import dynamic from 'next/dynamic';

const RecentTasksCard = dynamic(() => import('@/components/dashboard/recent-tasks-card'), {
  loading: () => <Skeleton className="h-[400px]" />,
});

const ActiveForumsCard = dynamic(() => import('@/components/dashboard/active-forums-card'), {
    loading: () => <Skeleton className="h-[400px]" />,
});


function ManagerDashboard() {
  const firestore = useFirestore();

  const projectsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'projects') : null, [firestore]);
  const { data: projectsData, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const tasksQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'tasks') : null, [firestore]);
  const { data: tasksData, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
  
  const stagesQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'stages') : null, [firestore]);
  const { data: stagesData, isLoading: isLoadingStages } = useCollection<Stage>(stagesQuery);

  const sealsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'seals') : null, [firestore]);
  const { data: sealsData, isLoading: isLoadingSeals } = useCollection<Seal>(sealsQuery);


  const { activeProjects, completedProjects, openTasks, tasksByStage, expiringSeals } = useMemo(() => {
    if (!projectsData || !tasksData || !stagesData || !sealsData) {
      return { activeProjects: 0, completedProjects: 0, openTasks: 0, tasksByStage: [], expiringSeals: 0 };
    }

    const tasksPerProject = tasksData.reduce((acc, task) => {
      if (!acc[task.projectId]) {
        acc[task.projectId] = [];
      }
      acc[task.projectId].push(task);
      return acc;
    }, {} as Record<string, Task[]>);

    let completedProjectsCount = 0;
    projectsData.forEach(project => {
      const projectTasks = tasksPerProject[project.id] || [];
      const allTasksCompleted = projectTasks.length > 0 && projectTasks.every(t => t.isCompleted);
      if (allTasksCompleted) {
        completedProjectsCount++;
      }
    });

    const openTasksCount = tasksData.filter(task => !task.isCompleted).length;
    
    const stageMap = new Map(stagesData.map(s => [s.id, s.name]));

    const tasksByStage = tasksData.reduce((acc, task) => {
      const stageName = stageMap.get(task.stageId) || 'Desconhecido';
      if (!acc[stageName]) {
        acc[stageName] = 0;
      }
      acc[stageName]++;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(tasksByStage).map(([name, total]) => ({ name, total }));
    
    const expiringSealsCount = sealsData.filter(seal => {
        const expiryDate = new Date(seal.expiryDate);
        return isPast(expiryDate) || differenceInDays(expiryDate, new Date()) <= 30;
    }).length;

    return {
      activeProjects: projectsData.length,
      completedProjects: completedProjectsCount,
      openTasks: openTasksCount,
      tasksByStage: chartData,
      expiringSeals: expiringSealsCount,
    };
  }, [projectsData, tasksData, stagesData, sealsData]);

  const isLoading = isLoadingProjects || isLoadingTasks || isLoadingStages || isLoadingSeals;
  
   return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Painel do Gestor</h1>
        <p className="text-muted-foreground">Visão geral completa das operações e vendas.</p>
      </header>
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <>
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </>
            ) : (
              <>
                <KpiCard 
                  title="Projetos Ativos" 
                  value={activeProjects.toString()}
                  description="Total de projetos em andamento"
                  icon={<FolderKanban className="text-primary"/>}
                />
                <KpiCard 
                  title="Projetos Concluídos" 
                  value={completedProjects.toString()}
                  description="Projetos com todas as tarefas finalizadas"
                  icon={<CheckCircle className="text-green-500"/>}
                />
                <KpiCard 
                  title="Tarefas Abertas" 
                  value={openTasks.toString()}
                  description="Total de tarefas não concluídas"
                  icon={<Target className="text-amber-500"/>}
                />
                 <KpiCard 
                  title="Selos Expirando" 
                  value={expiringSeals.toString()}
                  description="Selos vencidos ou vencendo em 30 dias"
                  icon={<Award className="text-red-500"/>}
                />
              </>
            )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <PipelineChart data={tasksByStage} isLoading={isLoading} />
                 <RecentTasksCard />
            </div>
            <div className="lg:col-span-1 space-y-6">
                <ActiveForumsCard />
            </div>
        </div>
    </div>
  );
}

export default ManagerDashboard;

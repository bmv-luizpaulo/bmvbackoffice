'use client';

import { useMemo } from 'react';
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CheckCircle, Target, FolderKanban, ListChecks, Award } from "lucide-react";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { ChatSummary } from "@/components/dashboard/chat-summary";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup } from "firebase/firestore";
import type { Project, Task, Stage, Seal } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { differenceInDays, isPast } from 'date-fns';


function KpiSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-[150px]" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-3 w-full mt-2" />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const firestore = useFirestore();

  const projectsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'projects') : null, [firestore]);
  const { data: projectsData, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const tasksQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'tasks') : null, [firestore]);
  const { data: tasksData, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
  
  const stagesQuery = useMemoFirebase(() => firestore && projectsData && projectsData.length > 0 ? collectionGroup(firestore, 'stages') : null, [firestore, projectsData]);
  const { data: stagesData, isLoading: isLoadingStages } = useCollection<Stage>(stagesQuery);

  const sealsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'seals') : null, [firestore]);
  const { data: sealsData, isLoading: isLoadingSeals } = useCollection<Seal>(sealsQuery);


  const { activeProjects, completedProjects, openTasks, tasksByStage, totalTasks, expiringSeals } = useMemo(() => {
    if (!projectsData || !tasksData || !stagesData || !sealsData) {
      return { activeProjects: 0, completedProjects: 0, openTasks: 0, tasksByStage: [], totalTasks: 0, expiringSeals: 0 };
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
    
    const totalTasks = tasksData.length;

    const expiringSealsCount = sealsData.filter(seal => {
        const expiryDate = new Date(seal.expiryDate);
        return isPast(expiryDate) || differenceInDays(expiryDate, new Date()) <= 30;
    }).length;

    return {
      activeProjects: projectsData.length,
      completedProjects: completedProjectsCount,
      openTasks: openTasksCount,
      tasksByStage: chartData,
      totalTasks: totalTasks,
      expiringSeals: expiringSealsCount,
    };
  }, [projectsData, tasksData, stagesData, sealsData]);

  const isLoading = isLoadingProjects || isLoadingTasks || isLoadingStages || isLoadingSeals;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-muted-foreground">Seu centro de comando para vendas e operações.</p>
      </header>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="tasks">Análise de Tarefas</TabsTrigger>
          <TabsTrigger value="collab">Colaboração</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <>
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
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
        </TabsContent>
        <TabsContent value="tasks" className="mt-6">
           <PipelineChart data={tasksByStage} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="collab" className="mt-6">
            <ChatSummary />
        </TabsContent>
      </Tabs>
    </div>
  );
}

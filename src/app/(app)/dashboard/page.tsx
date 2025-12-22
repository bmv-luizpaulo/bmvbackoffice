'use client';

import { useUser, usePermissions } from "@/firebase";
import { Skeleton } from '@/components/ui/skeleton';
import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { KpiCard } from "@/components/dashboard/kpi-card";
import { FolderKanban, Target, Award, RefreshCw, CheckCircle } from "lucide-react";
import { motion } from 'framer-motion';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserProjects } from "@/hooks/useUserProjects";
import { useUserTasks } from "@/hooks/useUserTasks";
import { isPast } from 'date-fns';

const RecentTasksCard = dynamic(() => import('@/components/dashboard/recent-tasks-card'), {
  loading: () => <Skeleton className="h-[400px]" />,
});
const PipelineChart = dynamic(() => import("@/components/dashboard/pipeline-chart").then(m => m.PipelineChart), { ssr: false });

function QuickActionsCard() {
  const actions = [
    { 
      title: 'Projetos', 
      icon: <FolderKanban className="h-5 w-5" />, 
      href: '/projetos',
      description: 'Gerencie seus projetos ativos',
      color: 'text-blue-500 bg-blue-50 hover:bg-blue-100'
    },
    { 
      title: 'Checklists', 
      icon: <CheckCircle className="h-5 w-5" />, 
      href: '/checklists',
      description: 'Acompanhe as atividades',
      color: 'text-green-500 bg-green-50 hover:bg-green-100'
    },
    { 
      title: 'Ativos', 
      icon: <Award className="h-5 w-5" />, 
      href: '/assets',
      description: 'Gerencie os ativos',
      color: 'text-purple-500 bg-purple-50 hover:bg-purple-100'
    },
    { 
      title: 'Manutenções', 
      icon: <Target className="h-5 w-5" />, 
      href: '/maintenance',
      description: 'Controle de manutenções',
      color: 'text-amber-500 bg-amber-50 hover:bg-amber-100'
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-headline flex items-center gap-2">
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {actions.map((action, index) => (
          <Button 
            key={index} 
            asChild 
            variant="ghost" 
            className={`h-auto py-3 px-4 justify-start text-left ${action.color} hover:shadow-sm transition-all`}
          >
            <a href={action.href} className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${action.color.replace('hover:bg-', 'bg-').split(' ')[0] + '-100'}`}>
                {action.icon}
              </div>
              <div>
                <div className="font-medium">{action.title}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
            </a>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <header>
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
            </header>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-[350px]" />
                    <Skeleton className="h-[300px]" />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <Skeleton className="h-[400px]" />
                    <Skeleton className="h-[400px]" />
                </div>
            </div>
        </div>
    );
}


function DashboardPage() {
  const { user: authUser, isUserLoading } = useUser();
  const { ready: permissionsReady, isManager } = usePermissions();
  const { projects: projectsData, isLoading: isLoadingProjects } = useUserProjects();
  const { tasks: tasksData, isLoading: isLoadingTasks } = useUserTasks();
  const [isRefreshing, setIsRefreshing] = React.useState(false);


  const { managerKpis, userKpis } = React.useMemo(() => {
    const managerKpis = {
      totalProjects: projectsData?.length || 0,
      completedProjects: projectsData?.filter(p => p.status === 'Arquivado').length || 0,
      inProgressTasks: tasksData?.filter(t => !t.isCompleted).length || 0,
      completedTasks: tasksData?.filter(t => t.isCompleted).length || 0,
      overdueTasks: tasksData?.filter(t => !t.isCompleted && t.dueDate && isPast(new Date(t.dueDate))).length || 0,
    };
    
    const userKpis = {
      openTasks: tasksData?.filter(t => !t.isCompleted).length || 0,
      activeProjects: projectsData?.filter(p => p.status === 'Em execução').length || 0,
    };
    return { managerKpis, userKpis };
  }, [projectsData, tasksData]);
  
  const completionRate = managerKpis.totalProjects > 0 ? Math.round((managerKpis.completedProjects / managerKpis.totalProjects) * 100) : 0;
  const taskCompletionRate = (tasksData?.length || 0) > 0 ? Math.round((managerKpis.completedTasks / tasksData!.length) * 100) : 0;

  const refreshData = async () => {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 1000);
  };

  const isLoading = isUserLoading || !permissionsReady || isLoadingProjects || isLoadingTasks;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            {isManager ? 'Visão Geral de Gestão' : 'Meu Painel'}
          </h1>
          <p className="text-muted-foreground">
            {isManager ? 'Bem-vindo de volta! Aqui está o resumo das atividades da empresa.' : 'Suas tarefas e atividades recentes.'}
          </p>
        </div>
         <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={refreshData}
                disabled={isRefreshing}
                className={`transition-all ${isRefreshing ? 'animate-spin' : 'hover:bg-gray-100'}`}
                aria-label="Atualizar dados"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'opacity-70' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Atualizar dados</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </header>

      {isManager ? (
        <>
            <motion.div 
                key={isRefreshing ? 'loading-manager' : 'loaded-manager'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            >
                <KpiCard title="Projetos Ativos" value={managerKpis.totalProjects.toString()} icon={<FolderKanban className="h-6 w-6" />} description={`${managerKpis.completedProjects} concluídos`} trend={completionRate > 50 ? 'up' : 'neutral'} trendValue={`${completionRate}%`} iconColor="text-blue-600" className="bg-white rounded-xl shadow-sm border border-gray-100"/>
                <KpiCard title="Tarefas" value={managerKpis.inProgressTasks.toString()} icon={<CheckCircle className="h-6 w-6" />} description={`${managerKpis.completedTasks} concluídas`} trend={taskCompletionRate > 50 ? 'up' : 'down'} trendValue={`${taskCompletionRate}%`} iconColor="text-green-600" className="bg-white rounded-xl shadow-sm border border-gray-100"/>
                <KpiCard title="Atrasados" value={managerKpis.overdueTasks.toString()} icon={<Target className="h-6 w-6" />} description="tarefas fora do prazo" trend={managerKpis.overdueTasks > 0 ? 'down' : 'neutral'} trendValue={managerKpis.inProgressTasks > 0 ? `${Math.round((managerKpis.overdueTasks / managerKpis.inProgressTasks) * 100)}%` : '0%'} iconColor="text-amber-500" className="bg-white rounded-xl shadow-sm border border-gray-100"/>
                <KpiCard title="Selo de Qualidade" value="Ouro" icon={<Award className="h-6 w-6" />} description="Nível atual" trend="up" trendValue="+12%" iconColor="text-purple-600" className="bg-white rounded-xl shadow-sm border border-gray-100"/>
            </motion.div>
             <div className="grid grid-cols-1 gap-6">
                <PipelineChart data={[]} isLoading={false} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RecentTasksCard />
                <QuickActionsCard />
            </div>
        </>
      ) : (
        <>
           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
               <KpiCard title="Minhas Tarefas Pendentes" value={userKpis.openTasks.toString()} description="Total de tarefas atribuídas a você" icon={<Target className="text-amber-500"/>} href="/agenda/tarefas?filter=me"/>
               <KpiCard title="Meus Projetos Ativos" value={userKpis.activeProjects.toString()} description="Projetos em que você está participando" icon={<FolderKanban className="text-primary"/>} href="/projetos?filter=me"/>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {authUser && <RecentTasksCard userId={authUser.id} />}
                </div>
            </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;

'use client';

import { useMemo, useState, useEffect } from 'react';
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CheckCircle, Target, FolderKanban, Award, RefreshCw } from "lucide-react";
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFirestore, useCollection, useMemoFirebase, usePermissions } from "@/firebase";
import { collection, query } from "firebase/firestore";
import type { Task } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { isPast } from 'date-fns';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from 'next/dynamic';
import { useUserProjects } from '@/hooks/useUserProjects';

interface KpiData {
  totalProjects: number;
  completedProjects: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  taskCompletionRate: number;
}

const RecentTasksCard = dynamic(() => import('@/components/dashboard/recent-tasks-card'), {
  loading: () => <Skeleton className="h-[400px]" />,
});
const PipelineChart = dynamic(() => import("@/components/dashboard/pipeline-chart").then(m => m.PipelineChart), { ssr: false });

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Skeleton className="col-span-4 h-[400px] rounded-xl" />
            <Skeleton className="col-span-3 h-[400px] rounded-xl" />
            </div>
        </div>
    );
}

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

function ManagerDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const firestore = useFirestore();
  const { ready: permissionsReady, isManager } = usePermissions();
  const { projects, isLoading: projectsLoading } = useUserProjects();

  const tasksQuery = useMemoFirebase(
    () => (firestore && permissionsReady && isManager) ? collection(firestore, 'tasks') : null, 
    [firestore, permissionsReady, isManager]
  );
  const { data: tasks, isLoading: tasksLoading } = useCollection<Task>(
    tasksQuery
  );

  const refreshData = async () => {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 1000);
  };

  const kpis = useMemo<KpiData>(() => {
    if (!permissionsReady || !isManager) return { totalProjects: 0, completedProjects: 0, inProgressTasks: 0, completedTasks: 0, overdueTasks: 0, completionRate: 0, taskCompletionRate: 0 };
    
    const totalProjects = projects?.length || 0;
    const completedProjects = projects?.filter(p => p.status === 'Arquivado').length || 0;
    const inProgressTasks = tasks?.filter(t => !t.isCompleted).length || 0;
    const completedTasks = tasks?.filter(t => t.isCompleted).length || 0;
    
    const overdueTasks = tasks?.filter(t => {
      if (!t.dueDate || t.isCompleted) return false;
      try {
        const dueDate = t.dueDate ? new Date(t.dueDate) : null;
        return dueDate && isPast(dueDate);
      } catch (e) {
        console.error('Erro ao processar data:', e);
        return false;
      }
    }).length || 0;

    return {
      totalProjects,
      completedProjects,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      completionRate: totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0,
      taskCompletionRate: tasks?.length ? Math.round((completedTasks / tasks.length) * 100) : 0,
    };
  }, [projects, tasks, permissionsReady, isManager]);

  if (projectsLoading || tasksLoading || !permissionsReady || !isManager) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Visão Geral de Gestão</h1>
          <p className="text-muted-foreground">Bem-vindo de volta! Aqui está o resumo das atividades da empresa.</p>
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
      <motion.div 
        key={isRefreshing ? 'loading' : 'loaded'}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          title="Projetos Ativos"
          value={kpis.totalProjects.toString()}
          icon={<FolderKanban className="h-6 w-6" />}
          description={`${kpis.completedProjects} concluídos`}
          trend={kpis.totalProjects > 0 ? 'up' : 'neutral'}
          trendValue={`${kpis.completionRate}%`}
          iconColor="text-blue-600"
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        />
        <KpiCard
          title="Tarefas"
          value={kpis.inProgressTasks.toString()}
          icon={<CheckCircle className="h-6 w-6" />}
          description={`${kpis.completedTasks} concluídas`}
          trend={kpis.taskCompletionRate > 50 ? 'up' : 'down'}
          trendValue={`${kpis.taskCompletionRate}%`}
          iconColor="text-green-600"
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        />
        <KpiCard
          title="Atrasados"
          value={kpis.overdueTasks.toString()}
          icon={<Target className="h-6 w-6" />}
          description="tarefas fora do prazo"
          trend={kpis.overdueTasks > 0 ? 'down' : 'neutral'}
          trendValue={kpis.inProgressTasks > 0 ? 
            `${Math.round((kpis.overdueTasks / kpis.inProgressTasks) * 100)}%` : '0%'}
          iconColor="text-amber-500"
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        />
        <KpiCard
          title="Selo de Qualidade"
          value="Ouro"
          icon={<Award className="h-6 w-6" />}
          description="Nível atual"
          trend="up"
          trendValue="+12%"
          iconColor="text-purple-600"
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        />
      </motion.div>

      <div className="grid grid-cols-1 gap-6">
        <PipelineChart data={[]} isLoading={false} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RecentTasksCard />
        <QuickActionsCard />
      </div>
    </div>
  );
}

export default ManagerDashboard;

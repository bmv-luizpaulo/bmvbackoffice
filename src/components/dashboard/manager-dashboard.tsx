'use client';

import { useMemo } from 'react';
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CheckCircle, Target, FolderKanban, Award } from "lucide-react";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup } from "firebase/firestore";
import type { Project, Task, Stage, Seal } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { isPast } from 'date-fns';
import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from 'next/dynamic';

// Interface para o retorno do useCollection
interface UseCollectionResult<T> {
  data: T[];
  loading: boolean;
  error?: Error;
}

// Definir tipos para os dados do Firebase
interface FirebaseTask extends Omit<Task, 'dueDate'> {
  id: string;
  dueDate?: string | { toDate: () => Date };
  status: 'pendente' | 'em-andamento' | 'concluida' | 'atrasada';
}

interface FirebaseProject extends Omit<Project, 'status'> {
  id: string;
  status: 'Em execução' | 'Arquivado';
}

// Tipos para os KPIs
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

// Ações rápidas com ícones e melhor visual
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
            <Link href={action.href} className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${action.color.replace('hover:bg-', 'bg-').split(' ')[0] + '-100'}`}>
                {action.icon}
              </div>
              <div>
                <div className="font-medium">{action.title}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}


function ManagerDashboard() {
  const firestore = useFirestore();

  const projectsQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'projects') : null, 
    [firestore]
  );
  const { data: projects = [], loading: projectsLoading } = useCollection<FirebaseProject>(
    projectsQuery
  ) as unknown as UseCollectionResult<FirebaseProject>;

  const tasksQuery = useMemoFirebase(
    () => firestore ? collectionGroup(firestore, 'tasks') : null, 
    [firestore]
  );
  const { data: tasks = [], loading: tasksLoading } = useCollection<FirebaseTask>(
    tasksQuery
  ) as unknown as UseCollectionResult<FirebaseTask>;

  // Calcular KPIs
  const kpis = useMemo<KpiData>(() => {
    const totalProjects = projects?.length || 0;
    const completedProjects = projects?.filter(p => p.status === 'concluido').length || 0;
    const inProgressTasks = tasks?.filter(t => t.status === 'em-andamento').length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'concluida').length || 0;
    
    const overdueTasks = tasks?.filter(t => {
      if (!t.dueDate) return false;
      try {
        const dueDate = typeof t.dueDate === 'object' && 'toDate' in t.dueDate 
          ? t.dueDate.toDate() 
          : new Date(t.dueDate as string);
        return !['concluida', 'cancelada'].includes(t.status) && isPast(dueDate);
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
  }, [projects, tasks]);

  if (projectsLoading || tasksLoading) {
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

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground">
          Bem-vindo de volta! Aqui está o que está acontecendo hoje.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Projetos Ativos"
          value={kpis.totalProjects.toString()}
          icon={() => <FolderKanban className="h-5 w-5" />}
          description={`${kpis.completedProjects} concluídos`}
          trend={kpis.totalProjects > 0 ? 'up' : 'neutral'}
          trendValue={`${kpis.completionRate}%`}
          iconColor="text-blue-500"
        />
        <KpiCard
          title="Tarefas"
          value={kpis.inProgressTasks.toString()}
          icon={() => <CheckCircle className="h-5 w-5" />}
          description={`${kpis.completedTasks} concluídas`}
          trend={kpis.taskCompletionRate > 50 ? 'up' : 'down'}
          trendValue={`${kpis.taskCompletionRate}%`}
          iconColor="text-green-500"
        />
        <KpiCard
          title="Atrasados"
          value={kpis.overdueTasks.toString()}
          icon={() => <Target className="h-5 w-5" />}
          description="tarefas fora do prazo"
          trend={kpis.overdueTasks > 0 ? 'down' : 'neutral'}
          trendValue={kpis.overdueTasks > 0 ? 
            `${Math.round((kpis.overdueTasks / kpis.inProgressTasks) * 100)}%` : '0%'}
          iconColor="text-amber-500"
        />
        <KpiCard
          title="Selo de Qualidade"
          value="Ouro"
          icon={() => <Award className="h-5 w-5" />}
          description="Nível atual"
          trend="up"
          trendValue="+12%"
          iconColor="text-purple-500"
        />
      </div>

      {/* Gráfico e Ações Rápidas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pipeline de Projetos</CardTitle>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                Ver todos
              </Button>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] p-6 pt-0">
            <PipelineChart data={projects ? projects.map(p => ({
            name: p.status,
            total: 1
          })).reduce((acc, curr) => {
            const existing = acc.find(item => item.name === curr.name);
            if (existing) {
              existing.total += 1;
            } else {
              acc.push({ ...curr });
            }
            return acc;
          }, [] as Array<{ name: string; total: number }>) : []} />
          </CardContent>
        </Card>
        <div className="col-span-3">
          <QuickActionsCard />
        </div>
      </div>

      {/* Tarefas Recentes e Atividades */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <RecentTasksCard />
        </div>
        <Card className="col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-4 px-6 pb-6">
              {[
                { id: 1, title: 'Novo projeto criado', description: 'Projeto de modernização iniciado', time: 'Há 2 horas' },
                { id: 2, title: 'Tarefa concluída', description: 'Checklist de segurança finalizado', time: 'Hoje às 10:30' },
                { id: 3, title: 'Atualização de status', description: 'Projeto aprovado na revisão', time: 'Ontem' },
                { id: 4, title: 'Novo membro', description: 'João foi adicionado à equipe', time: 'Ontem' },
              ].map((activity) => (
                <div key={activity.id} className="group relative flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                  <div className="relative mt-1 flex h-2 w-2 flex-shrink-0 items-center justify-center">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">{activity.title}</p>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t px-6 py-3">
              <Button variant="ghost" size="sm" className="w-full">
                Ver todas as atividades
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ManagerDashboard;

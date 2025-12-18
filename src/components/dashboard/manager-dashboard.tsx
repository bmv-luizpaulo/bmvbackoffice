'use client';

import { useMemo, useState, useEffect } from 'react';
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CheckCircle, Target, FolderKanban, Award, RefreshCw, Info } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

// Import fonts
import { Raleway, Montserrat } from 'next/font/google';

// Configure Raleway for headings
const raleway = Raleway({
  weight: ['800'], // Extra bold for headings
  subsets: ['latin'],
  variable: '--font-raleway',
  display: 'swap',
});

// Configure Montserrat for body text
const montserrat = Montserrat({
  weight: ['400', '500'], // Normal for text, medium for emphasized text
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const firestore = useFirestore();

  const projectsQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'projects') : null, 
    [firestore]
  );
  const { data: projects = [], loading: projectsLoading, refresh: refreshProjects } = useCollection<FirebaseProject>(
    projectsQuery
  ) as unknown as UseCollectionResult<FirebaseProject> & { refresh: () => Promise<void> };

  const tasksQuery = useMemoFirebase(
    () => firestore ? collectionGroup(firestore, 'tasks') : null, 
    [firestore]
  );
  const { data: tasks = [], loading: tasksLoading, refresh: refreshTasks } = useCollection<FirebaseTask>(
    tasksQuery
  ) as unknown as UseCollectionResult<FirebaseTask> & { refresh: () => Promise<void> };

  const refreshData = async () => {
    try {
      setIsRefreshing(true);
      await Promise.all([refreshProjects?.(), refreshTasks?.()]);
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500); // Tempo mínimo de carregamento para melhor UX
    }
  };

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
    <div className={`space-y-6 ${montserrat.className}`}>
      {/* Cabeçalho */}
      <div className="flex justify-between items-start">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`${raleway.className} text-[35px] font-extrabold text-gray-900`}
          >
            Visão Geral
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="text-gray-600 text-[16px] mt-2"
          >
            Bem-vindo de volta! Aqui está o que está acontecendo hoje.
          </motion.p>
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
      </div>

      {/* KPIs */}
      <AnimatePresence mode="wait">
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
          titleClassName={raleway.className}
          value={kpis.totalProjects.toString()}
          valueClassName="text-3xl font-extrabold text-gray-900"
          icon={() => <FolderKanban className="h-6 w-6 text-blue-600" />}
          description={`${kpis.completedProjects} concluídos`}
          trend={kpis.totalProjects > 0 ? 'up' : 'neutral'}
          trendValue={`${kpis.completionRate}%`}
          iconColor="text-blue-600"
          className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        />
        <KpiCard
          title="Tarefas"
          titleClassName={raleway.className}
          value={kpis.inProgressTasks.toString()}
          valueClassName="text-3xl font-extrabold text-gray-900"
          icon={() => <CheckCircle className="h-6 w-6 text-green-600" />}
          description={`${kpis.completedTasks} concluídas`}
          trend={kpis.taskCompletionRate > 50 ? 'up' : 'down'}
          trendValue={`${kpis.taskCompletionRate}%`}
          iconColor="text-green-600"
          className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        />
        <KpiCard
          title="Atrasados"
          titleClassName={raleway.className}
          value={kpis.overdueTasks.toString()}
          valueClassName="text-3xl font-extrabold text-gray-900"
          icon={() => <Target className="h-6 w-6 text-amber-500" />}
          description="tarefas fora do prazo"
          trend={kpis.overdueTasks > 0 ? 'down' : 'neutral'}
          trendValue={kpis.overdueTasks > 0 ? 
            `${Math.round((kpis.overdueTasks / kpis.inProgressTasks) * 100)}%` : '0%'}
          iconColor="text-amber-500"
          className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        />
        <KpiCard
          title="Selo de Qualidade"
          titleClassName={raleway.className}
          value="Ouro"
          valueClassName="text-3xl font-extrabold text-gray-900"
          icon={() => <Award className="h-6 w-6 text-purple-600" />}
          description="Nível atual"
          trend="up"
          trendValue="+12%"
          iconColor="text-purple-600"
          className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        />
        </motion.div>
      </AnimatePresence>

      {/* Gráfico e Ações Rápidas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xl font-extrabold text-gray-900 ${raleway.className}`}>Pipeline de Projetos</CardTitle>
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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-7"
      >
        <div className="col-span-4">
          <RecentTasksCard />
        </div>
        <Card className="col-span-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xl font-extrabold text-gray-900 ${raleway.className}`}>
                Atividades Recentes
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg px-2 py-1 -mr-2"
              >
                Ver todas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {[
                { 
                  id: 1, 
                  title: 'Novo projeto criado', 
                  description: 'Projeto de modernização iniciado com sucesso e já em andamento', 
                  time: 'Há 2 horas',
                  icon: '📋',
                  color: 'bg-blue-100 text-blue-600'
                },
                { 
                  id: 2, 
                  title: 'Tarefa concluída', 
                  description: 'Checklist de segurança finalizado e aprovado', 
                  time: 'Hoje às 10:30',
                  icon: '✅',
                  color: 'bg-green-100 text-green-600'
                },
                { 
                  id: 3, 
                  title: 'Atualização de status', 
                  description: 'Projeto aprovado na revisão de entrega', 
                  time: 'Ontem',
                  icon: '🔄',
                  color: 'bg-purple-100 text-purple-600'
                },
                { 
                  id: 4, 
                  title: 'Novo membro', 
                  description: 'João Silva foi adicionado à equipe de desenvolvimento', 
                  time: 'Ontem',
                  icon: '👤',
                  color: 'bg-amber-100 text-amber-600'
                },
              ].map((activity, index) => (
                <motion.div 
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="group relative flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${activity.color} text-sm`}>
                    {activity.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {activity.time}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {activity.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="border-t px-6 py-3 bg-gray-50 rounded-b-xl">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full group hover:bg-white transition-colors text-blue-600 hover:text-blue-700"
              >
                <span className="group-hover:translate-x-1 transition-transform">
                  Ver histórico completo
                </span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" 
                    clipRule="evenodd" 
                  />
                </svg>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default ManagerDashboard;

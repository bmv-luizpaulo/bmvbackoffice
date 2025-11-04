'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';
import * as React from 'react';
import { FolderKanban, KanbanSquare } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "next/navigation";

const ProjectDataTable = dynamic(() => import("@/components/projects/project-data-table").then(m => m.ProjectDataTable), { 
    ssr: false,
    loading: () => <ProjectDataTableSkeleton />
});

function ProjectDataTableSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex justify-between">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="border rounded-md">
                <div className="space-y-2 p-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            </div>
        </div>
    )
}

export default function ProjectsListPage() {
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');
  const [tab, setTab] = React.useState<'em-execucao' | 'arquivados'>('em-execucao');

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
            <FolderKanban className="h-8 w-8 text-primary" />
            {filter === 'me' ? 'Meus Projetos' : 'Projetos'}
            </h1>
            <p className="text-muted-foreground">
            {filter === 'me'
              ? 'Visualize os projetos em que você está envolvido.'
              : 'Visualize e gerencie todos os seus projetos em um só lugar.'
            }
            </p>
        </div>
        <Button asChild variant="outline">
            <Link href="/projects">
                <KanbanSquare className="mr-2 h-4 w-4" />
                Acessar Quadro Kanban
            </Link>
        </Button>
      </header>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="em-execucao">Em Execução</TabsTrigger>
          <TabsTrigger value="arquivados">Arquivados</TabsTrigger>
        </TabsList>
        <TabsContent value="em-execucao">
          <Card>
            <CardHeader>
              <CardTitle>Projetos em Execução</CardTitle>
              <CardDescription>Projetos que estão atualmente ativos.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectDataTable statusFilter="Em execução" userFilter={filter} />
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="arquivados">
          <Card>
            <CardHeader>
              <CardTitle>Projetos Arquivados</CardTitle>
              <CardDescription>Projetos que foram concluídos ou arquivados.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectDataTable statusFilter="Arquivado" userFilter={filter} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

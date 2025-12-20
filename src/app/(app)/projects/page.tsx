'use client';
import { Suspense } from "react";
import { KanbanBoardSkeleton } from "@/components/projects/kanban-board-skeleton";
import ClientKanbanBoard from "@/components/projects/client-kanban-board";
import { useSearchParams } from "next/navigation";

function KanbanPageContent() {
  const searchParams = useSearchParams();
  const newProject = searchParams.get('new') === 'true';

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14)-2*theme(spacing.6))] flex-col gap-4">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Quadro Kanban</h1>
        <p className="text-muted-foreground">Gerencie seus projetos e tarefas do início ao fim com a visualização em colunas.</p>
      </header>
      <div className="flex-1 overflow-hidden">
        <ClientKanbanBoard openNewProjectDialog={newProject} />
      </div>
    </div>
  );
}


export default function KanbanPage() {
  return <KanbanPageContent />;
}

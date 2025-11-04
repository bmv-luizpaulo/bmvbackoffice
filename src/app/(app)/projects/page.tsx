import { Suspense } from "react";
import { KanbanBoardSkeleton } from "@/components/projects/kanban-board-skeleton";
import ClientKanbanBoard from "@/components/projects/client-kanban-board";

export default function ProjectsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {

  const newProject = searchParams?.new === 'true';

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14)-2*theme(spacing.6))] flex-col gap-4">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Funil de Tarefas</h1>
        <p className="text-muted-foreground">Gerencie seus projetos e tarefas do início ao fim.</p>
      </header>
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<KanbanBoardSkeleton />}>
          <ClientKanbanBoard openNewProjectDialog={newProject} />
        </Suspense>
      </div>
    </div>
  );
}

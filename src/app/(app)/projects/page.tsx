import { Suspense } from "react";
import dynamic from 'next/dynamic';
import { KanbanBoardSkeleton } from "@/components/projects/kanban-board-skeleton";

const KanbanBoard = dynamic(() => import('@/components/projects/kanban-board').then(m => m.KanbanBoard), {
  ssr: false,
  loading: () => <KanbanBoardSkeleton />,
});

export default function ProjectsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {

  const newProject = searchParams?.new === 'true';

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14)-2*theme(spacing.6))] flex-col gap-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Funil de Tarefas</h1>
        <p className="text-muted-foreground">Gerencie seus projetos e tarefas do início ao fim.</p>
      </header>
      <div className="flex-1 overflow-x-auto">
        <Suspense fallback={<KanbanBoardSkeleton />}>
          <KanbanBoard openNewProjectDialog={newProject} />
        </Suspense>
      </div>
    </div>
  );
}

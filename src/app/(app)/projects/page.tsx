'use client';
import ClientKanbanBoard from "@/components/projects/client-kanban-board";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { List } from "lucide-react";

function KanbanPageContent() {
  const searchParams = useSearchParams();
  const newProject = searchParams.get('new') === 'true';

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14)-2*theme(spacing.6))] flex-col gap-4">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Quadro Kanban</h1>
          <p className="text-muted-foreground">Gerencie seus projetos e tarefas do início ao fim com a visualização em colunas.</p>
        </div>
        <Button asChild variant="outline">
            <Link href="/projetos">
                <List className="mr-2 h-4 w-4" />
                Ver Lista de Projetos
            </Link>
        </Button>
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

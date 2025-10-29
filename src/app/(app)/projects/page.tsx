import { KanbanBoard } from "@/components/projects/kanban-board";

export default function ProjectsPage() {
  return (
    <div className="flex h-[calc(100vh-theme(spacing.14)-2*theme(spacing.6))] flex-col gap-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Funil de Projetos</h1>
        <p className="text-muted-foreground">Gerencie seus projetos e tarefas do início ao fim.</p>
      </header>
      <div className="flex-1 overflow-x-auto">
        <p>Em breve: Um painel Kanban para visualizar seus projetos e seu progresso através das etapas.</p>
      </div>
    </div>
  );
}

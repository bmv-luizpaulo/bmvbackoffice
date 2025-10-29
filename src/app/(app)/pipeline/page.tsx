import { KanbanBoard } from "@/components/pipeline/kanban-board";

export default function PipelinePage() {
  return (
    <div className="flex h-[calc(100vh-theme(spacing.14)-2*theme(spacing.6))] flex-col gap-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Sales Pipeline</h1>
        <p className="text-muted-foreground">Manage your opportunities from lead to close.</p>
      </header>
      <div className="flex-1 overflow-x-auto">
        <KanbanBoard />
      </div>
    </div>
  );
}

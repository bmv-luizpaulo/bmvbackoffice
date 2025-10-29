'use client';

import { useDroppable } from '@dnd-kit/core';
import type { Stage, Task } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { KanbanCard } from './kanban-card';

type KanbanColumnProps = {
  stage: Stage;
  tasks: (Task & { isLocked?: boolean })[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
};

export function KanbanColumn({ stage, tasks, onUpdateTask, onDeleteTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div 
        ref={setNodeRef} 
        className="flex w-80 shrink-0 flex-col rounded-lg transition-colors"
    >
      <div className="flex flex-col rounded-t-lg bg-card p-3 shadow">
        <div className="flex items-center justify-between">
            <h2 className="font-semibold">{stage.name}</h2>
            <Badge variant="secondary" className="font-mono text-sm">{tasks.length}</Badge>
        </div>
      </div>
      <div 
        className={`flex flex-1 flex-col gap-3 overflow-y-auto p-3 rounded-b-lg transition-colors ${isOver ? 'bg-primary/10' : 'bg-muted/50'}`}
        style={{ minHeight: '150px' }}
      >
        {tasks.map(task => (
          <KanbanCard 
            key={task.id} 
            task={task} 
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            />
        ))}
        {tasks.length === 0 && (
            <div className="flex h-full items-center justify-center rounded-md border-2 border-dashed border-border">
                <p className="text-sm text-muted-foreground">Arraste tarefas aqui</p>
            </div>
        )}
      </div>
    </div>
  );
}

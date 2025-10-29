'use client';

import { useDroppable } from '@dnd-kit/core';
import type { Stage, Task, User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { KanbanCard } from './kanban-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Info } from 'lucide-react';

type KanbanColumnProps = {
  stage: Stage;
  tasks: (Task & { isLocked?: boolean; assignee?: User })[];
  onUpdateTask: (taskId: string, updates: Partial<Omit<Task, 'id'>>) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
};

export function KanbanColumn({ stage, tasks, onUpdateTask, onDeleteTask, onEditTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div 
        ref={setNodeRef} 
        className="flex w-80 shrink-0 flex-col rounded-lg transition-colors"
    >
      <div className="flex flex-col rounded-t-lg bg-card p-3 shadow">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <h2 className="font-semibold">{stage.name}</h2>
                {stage.description && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{stage.description}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
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
            onEditTask={onEditTask}
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

'use client';

import React, { memo, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Stage, Task, User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { KanbanCard } from './kanban-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Info } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

type KanbanColumnProps = {
  stage: Stage;
  tasks: (Task & { isLocked?: boolean; assignee?: User })[];
  onUpdateTask: (taskId: string, updates: Partial<Omit<Task, 'id'>>) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onAddDependentTask: (dependencyId: string) => void;
};

function KanbanColumnComponent({ stage, tasks, onUpdateTask, onDeleteTask, onEditTask, onAddDependentTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 120,
    overscan: 6,
  });

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
        ref={scrollRef}
        className={`flex flex-1 flex-col overflow-y-auto p-3 rounded-b-lg transition-colors ${isOver ? 'bg-primary/10' : 'bg-muted/50'}`}
        style={{ minHeight: '150px' }}
      >
        {tasks.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border-2 border-dashed border-border">
            <p className="text-sm text-muted-foreground">Arraste tarefas aqui</p>
          </div>
        ) : (
          <div
            className="relative w-full"
            style={{ height: rowVirtualizer.getTotalSize() }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const task = tasks[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute left-0 top-0 w-full pb-3"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <KanbanCard
                    task={task}
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                    onEditTask={onEditTask}
                    onAddDependentTask={onAddDependentTask}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const areEqual = (prev: KanbanColumnProps, next: KanbanColumnProps) => {
  if (
    prev.stage.id !== next.stage.id ||
    prev.stage.name !== next.stage.name ||
    prev.stage.description !== next.stage.description
  ) return false;
  if (prev.tasks.length !== next.tasks.length) return false;
  for (let i = 0; i < prev.tasks.length; i++) {
    const a = prev.tasks[i];
    const b = next.tasks[i];
    if (a.id !== b.id) return false;
    if ((a.isLocked ? 1 : 0) !== (b.isLocked ? 1 : 0)) return false;
    const aAssignee = (a as any).assignee?.id || (a as any).assigneeId || '';
    const bAssignee = (b as any).assignee?.id || (b as any).assigneeId || '';
    if (aAssignee !== bAssignee) return false;
  }
  return true;
};

export const KanbanColumn = memo(KanbanColumnComponent, areEqual);

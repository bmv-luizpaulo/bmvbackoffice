'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { Task } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Trash2, Lock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

type KanbanCardProps = {
  task: Task & { isLocked?: boolean };
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
};

export function KanbanCard({ task, onUpdateTask, onDeleteTask }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: task.isLocked,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCheckedChange = (checked: boolean) => {
    onUpdateTask(task.id, { isCompleted: checked });
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group shadow-sm hover:shadow-md transition-shadow",
        task.isLocked ? "cursor-not-allowed bg-muted/50" : "cursor-grab active:cursor-grabbing",
      )}
    >
      <CardHeader className="p-4 flex flex-row items-start justify-between space-y-0 gap-4">
        <div className="flex items-center gap-2">
            <Checkbox checked={task.isCompleted} onCheckedChange={handleCheckedChange} aria-label="Marcar como concluída" />
            <CardTitle className={cn(
              'text-base font-medium',
              task.isCompleted && 'line-through text-muted-foreground',
              task.isLocked && 'text-muted-foreground'
            )}>
                {task.name}
            </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          {task.isLocked && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Esta tarefa depende de outras</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente a tarefa "{task.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDeleteTask(task.id)}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      {task.description && (
         <CardContent className="p-4 pt-0">
            <p className={cn('text-sm text-muted-foreground', task.isLocked && 'text-muted-foreground/70')}>{task.description}</p>
         </CardContent>
      )}
    </Card>
  );
}

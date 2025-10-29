'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { Task } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';

type KanbanCardProps = {
  task: Task;
};

export function KanbanCard({ task }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
    >
      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-medium">{task.name}</CardTitle>
        <Checkbox checked={task.isCompleted} aria-label="Marcar como concluída" />
      </CardHeader>
      {task.description && (
         <CardContent className="p-4 pt-0">
            <p className='text-sm text-muted-foreground'>{task.description}</p>
         </CardContent>
      )}
    </Card>
  );
}

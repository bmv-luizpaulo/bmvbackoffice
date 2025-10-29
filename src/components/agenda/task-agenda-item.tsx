'use client';

import type { Task, Project, User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Folder } from 'lucide-react';
import {
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';

interface TaskAgendaItemProps {
  task: Task & { dueDate: Date };
  project?: Project;
  assignee?: User;
}

export function TaskAgendaItem({ task, project, assignee }: TaskAgendaItemProps) {
  const firestore = useFirestore();

  const handleCheckedChange = (checked: boolean) => {
    if (!firestore || !project) return;
    const taskRef = doc(firestore, 'projects', project.id, 'tasks', task.id);
    updateDocumentNonBlocking(taskRef, { isCompleted: checked });
  };

  return (
    <div className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50">
      <div className="pt-1">
        <Checkbox 
            checked={task.isCompleted} 
            onCheckedChange={handleCheckedChange}
        />
      </div>
      <div className="flex-1">
        <p className={cn("font-medium", task.isCompleted && "line-through text-muted-foreground")}>{task.name}</p>
        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
          {project && (
            <div className="flex items-center gap-1">
                <Folder className="h-3 w-3" />
                <span>{project.name}</span>
            </div>
          )}
        </div>
      </div>
      {assignee && (
         <TooltipProvider>
            <Tooltip>
            <TooltipTrigger>
                <Avatar className="h-8 w-8">
                    <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                    <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                </Avatar>
            </TooltipTrigger>
            <TooltipContent>
                <p>{assignee.name}</p>
            </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

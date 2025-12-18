
'use client';

import type { Task, Project, User, Meeting } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Folder, Check, Video } from 'lucide-react';
import {
  updateDocumentNonBlocking,
} from '@/firebase';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '../ui/button';

type AgendaItem = (Task & { itemType: 'task' }) | (Meeting & { itemType: 'meeting' });

interface TaskAgendaItemProps {
  item: AgendaItem;
  project?: Project;
  assignee?: User;
}

export function TaskAgendaItem({ item, project, assignee }: TaskAgendaItemProps) {
  const firestore = useFirestore();

  const handleToggleComplete = () => {
    if (!firestore || item.itemType !== 'task') return;
    const collectionPath = item.projectId ? `projects/${item.projectId}/tasks` : 'tasks';
    const taskRef = doc(firestore, collectionPath, item.id);
    updateDocumentNonBlocking(taskRef, { isCompleted: !item.isCompleted });
  };
  
  const isMeeting = item.itemType === 'meeting';

  return (
    <div className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50">
      <div className="pt-1">
        {isMeeting ? (
          <Video className="h-4 w-4 text-primary" />
        ) : (
          <div
            role="checkbox"
            aria-checked={item.isCompleted}
            onClick={handleToggleComplete}
            onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && handleToggleComplete()}
            tabIndex={0}
            className={cn(
              "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer flex items-center justify-center",
              item.isCompleted ? "bg-primary text-primary-foreground" : "bg-transparent"
            )}
          >
            {item.isCompleted && <Check className="h-4 w-4" />}
          </div>
        )}
      </div>
      <div className="flex-1">
        <p className={cn("font-medium", item.itemType === 'task' && item.isCompleted && "line-through text-muted-foreground")}>{item.name}</p>
        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
          {project && (
            <div className="flex items-center gap-1">
                <Folder className="h-3 w-3" />
                <span>{project.name}</span>
            </div>
          )}
        </div>
        {isMeeting && item.meetLink && (
            <Button variant="link" size="sm" asChild className="p-0 h-auto mt-1">
              <a href={item.meetLink} target="_blank" rel="noopener noreferrer">
                Entrar na Reunião
              </a>
            </Button>
          )}
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

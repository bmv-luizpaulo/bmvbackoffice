'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import type { Task, User, Team } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Trash2, Lock, Calendar as CalendarIcon, Edit, PlusCircle, Users } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { memo } from 'react';
import { useUser as useAuthUser, useDoc, useFirestore } from '@/firebase';
import type { Role } from '@/lib/types';
import React from 'react';
import { doc } from 'firebase/firestore';


type KanbanCardProps = {
  task: Task & { isLocked?: boolean; assignee?: User; team?: Team };
  onUpdateTask: (taskId: string, updates: Partial<Omit<Task, 'id'>>) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onAddDependentTask: (dependencyId: string) => void;
};

function KanbanCardComponent({ task, onUpdateTask, onDeleteTask, onEditTask, onAddDependentTask }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: task.isLocked,
  });
  
  const firestore = useFirestore();
  const { user: authUser } = useAuthUser();
  const userProfileQuery = React.useMemo(() => firestore && authUser?.uid ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser?.uid]);
  const { data: userProfile } = useDoc<User>(userProfileQuery);
  const roleQuery = React.useMemo(() => firestore && userProfile?.roleId ? doc(firestore, 'roles', userProfile.roleId) : null, [firestore, userProfile?.roleId]);
  const { data: role } = useDoc<Role>(roleQuery);
  const isPrivilegedUser = role?.isManager || role?.isDev;


  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCheckedChange = (checked: boolean) => {
    onUpdateTask(task.id, { isCompleted: checked });
  };
  
  const getDueDateInfo = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      const daysOverdue = differenceInDays(new Date(), date);
      return { text: `Atrasado há ${daysOverdue}d`, color: 'text-destructive' };
    }
    if (isToday(date)) {
      return { text: 'Vence hoje', color: 'text-amber-600' };
    }
    const daysLeft = differenceInDays(date, new Date());
    if (daysLeft <= 3) {
      return { text: `Vence em ${daysLeft + 1}d`, color: 'text-amber-600' };
    }
    return { text: format(date, 'dd/MM'), color: 'text-muted-foreground' };
  };

  const dueDateInfo = task.dueDate ? getDueDateInfo(task.dueDate) : null;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "group shadow-sm hover:shadow-md transition-shadow flex flex-col",
        task.isLocked ? "cursor-not-allowed bg-muted/50" : "cursor-grab active:cursor-grabbing",
        isDragging && "ring-2 ring-primary",
      )}
    >
      <div {...attributes} {...listeners}>
        <CardHeader className="p-3 flex flex-row items-start justify-between space-y-0 gap-4">
          <div className="flex items-center gap-2 pt-1">
              <Checkbox 
                checked={task.isCompleted} 
                onCheckedChange={handleCheckedChange} 
                aria-label="Marcar como concluída" 
                disabled={task.isLocked}
              />
              <CardTitle className={cn(
                'text-base font-medium leading-tight',
                task.isCompleted && 'line-through text-muted-foreground',
                task.isLocked && !task.isCompleted && 'text-muted-foreground'
              )}>
                  {task.name}
              </CardTitle>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {task.isLocked && !task.isCompleted && (
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
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
               <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditTask(task as Task)}>
                  <Edit className="h-4 w-4" />
              </Button>
              {isPrivilegedUser && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
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
                      <AlertDialogAction onClick={() => onDeleteTask(task.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        {task.description && (
           <CardContent className="p-3 pt-0">
              <p className={cn('text-sm text-muted-foreground', task.isCompleted && 'line-through', task.isLocked && !task.isCompleted && 'text-muted-foreground/70')}>{task.description}</p>
           </CardContent>
        )}
      </div>
      <CardFooter className="p-3 pt-0 mt-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
            {dueDateInfo && !task.isCompleted && (
                <div className={cn("flex items-center gap-1 text-xs font-medium", dueDateInfo.color)}>
                    <CalendarIcon className="h-3.5 w-3.5"/>
                    <span>{dueDateInfo.text}</span>
                </div>
            )}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => onAddDependentTask(task.id)}>
                            <PlusCircle className="h-4 w-4 text-primary" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Adicionar tarefa dependente</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
        {task.assignee ? (
             <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={task.assignee.avatarUrl} alt={task.assignee.name} />
                        <AvatarFallback>{task.assignee.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{task.assignee.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
        ) : task.team ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                    <Avatar className="h-6 w-6">
                        <AvatarFallback><Users className="h-4 w-4 text-muted-foreground"/></AvatarFallback>
                    </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Equipe: {task.team.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
        ) : null}
      </CardFooter>
    </Card>
  );
}

const areEqual = (prev: KanbanCardProps, next: KanbanCardProps) => {
  const a = prev.task;
  const b = next.task;
  if (a.id !== b.id) return false;
  if (a.name !== b.name) return false;
  if ((a.description || '') !== (b.description || '')) return false;
  if ((a.isCompleted ? 1 : 0) !== (b.isCompleted ? 1 : 0)) return false;
  if ((a.isLocked ? 1 : 0) !== (b.isLocked ? 1 : 0)) return false;
  if ((a.dueDate || '') !== (b.dueDate || '')) return false;
  if ((a.assigneeId || '') !== (b.assigneeId || '')) return false;
  if ((a.teamId || '') !== (b.teamId || '')) return false;
  if (a.assignee?.id !== b.assignee?.id) return false;
  if (a.team?.id !== b.team?.id) return false;
  return true;
};

export const KanbanCard = memo(KanbanCardComponent, areEqual);

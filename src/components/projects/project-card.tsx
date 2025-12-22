
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, FolderKanban, MoreVertical, Pencil, Archive } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Project, Task, User } from '@/lib/types';
import Link from 'next/link';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface ProjectCardProps {
  project: Project;
  tasks: Task[];
  owner?: User;
  teamMembers: User[];
  onEdit: (project: Project) => void;
}

export function ProjectCard({ project, tasks, owner, teamMembers, onEdit }: ProjectCardProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const { completedTasks, totalTasks, progress } = React.useMemo(() => {
    const total = tasks.length;
    if (total === 0) return { completedTasks: 0, totalTasks: 0, progress: 0 };
    const completed = tasks.filter(t => t.isCompleted).length;
    return {
      completedTasks: completed,
      totalTasks: total,
      progress: Math.round((completed / total) * 100)
    };
  }, [tasks]);

  const handleToggleArchive = async () => {
    if (!firestore) return;
    const newStatus = project.status === 'Arquivado' ? 'Em execução' : 'Arquivado';
    await updateDocumentNonBlocking(doc(firestore, 'projects', project.id), { status: newStatus });
    toast({ title: `Projeto ${newStatus === 'Arquivado' ? 'Arquivado' : 'Restaurado'}` });
  };
  
  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const displayMembers = teamMembers.slice(0, 4);
  const remainingMembers = teamMembers.length - displayMembers.length;

  return (
    <Card className="flex flex-col transition-all hover:shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <CardTitle className="font-bold text-lg leading-tight">{project.name}</CardTitle>
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => onEdit(project)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleToggleArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  {project.status === 'Arquivado' ? 'Restaurar' : 'Arquivar'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <CardDescription className="line-clamp-2 h-10">{project.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-muted-foreground">Progresso</span>
            <span className="text-sm font-bold">{progress}%</span>
          </div>
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground mt-1">{completedTasks} de {totalTasks} tarefas concluídas</p>
        </div>

        <div className="flex justify-between items-center text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4"/>
                <span>{format(new Date(project.startDate), "dd/MM/yy", { locale: ptBR })}</span>
                <span>-</span>
                <span>{project.endDate ? format(new Date(project.endDate), "dd/MM/yy", { locale: ptBR }) : "Sem prazo"}</span>
            </div>
            {project.endDate && (
                <span className="font-medium">{formatDistanceToNowStrict(new Date(project.endDate), { locale: ptBR, addSuffix: true })}</span>
            )}
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-4">
        <div className="flex w-full justify-between items-center">
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Equipe:</span>
                <div className="flex items-center -space-x-2">
                    {displayMembers.map(member => (
                        <TooltipProvider key={member.id}>
                            <Tooltip>
                                <TooltipTrigger asChild><Avatar className="h-7 w-7 border-2 border-background"><AvatarImage src={member.avatarUrl} /><AvatarFallback>{getInitials(member.name)}</AvatarFallback></Avatar></TooltipTrigger>
                                <TooltipContent><p>{member.name}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                    {remainingMembers > 0 && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild><Avatar className="h-7 w-7 border-2 border-background"><AvatarFallback>+{remainingMembers}</AvatarFallback></Avatar></TooltipTrigger>
                                <TooltipContent><p>e mais {remainingMembers} membro(s)</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </div>
            {owner && (
                 <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Dono:</span>
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild><Avatar className="h-7 w-7"><AvatarImage src={owner.avatarUrl} /><AvatarFallback>{getInitials(owner.name)}</AvatarFallback></Avatar></TooltipTrigger>
                            <TooltipContent><p>{owner.name}</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )}
        </div>
         <Button asChild className="w-full">
            <Link href={`/projetos/quadro?projectId=${project.id}`}>
                <FolderKanban className="mr-2 h-4 w-4" />
                Ver Kanban
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

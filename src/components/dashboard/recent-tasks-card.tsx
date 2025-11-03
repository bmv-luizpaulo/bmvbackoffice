'use client';
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup, query, where, orderBy, limit } from "firebase/firestore";
import type { Task, Project } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListTodo, Folder } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import Link from "next/link";
import { Button } from "../ui/button";

function RecentTasksCard() {
    const firestore = useFirestore();
    const tasksQuery = useMemoFirebase(() => 
        firestore 
        ? query(
            collectionGroup(firestore, 'tasks'), 
            where('isCompleted', '==', false),
            orderBy('createdAt', 'desc'),
            limit(5)
          ) 
        : null, 
    [firestore]);

    const { data: tasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
    
    const projectsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'projects') : null, [firestore]);
    const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

    const projectsMap = React.useMemo(() => new Map(projects?.map(p => [p.id, p.name])), [projects]);

    const isLoading = isLoadingTasks || isLoadingProjects;

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <ListTodo className="text-primary"/>
                    Tarefas Recentes
                </CardTitle>
                <CardDescription>
                    As últimas tarefas que precisam de atenção.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {isLoading && (
                        <>
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </>
                    )}
                    {!isLoading && tasks && tasks.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa aberta encontrada.</p>
                    )}
                    {tasks?.map(task => (
                        <Link href={`/projects?projectId=${task.projectId}`} key={task.id}>
                            <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">{task.name}</p>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                        <Folder className="h-3 w-3"/>
                                        <span>{projectsMap.get(task.projectId) || 'Projeto desconhecido'}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                    {!isLoading && tasks && tasks.length > 0 && (
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/projects">Ver todas as tarefas</Link>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default RecentTasksCard;

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DndContext, type DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useToast } from '@/hooks/use-toast';
import { KanbanColumn } from './kanban-column';
import type { Task, Stage, Project, User } from '@/lib/types';
import { Button } from '../ui/button';
import { Plus, FolderPlus, ChevronsUpDown, Files } from 'lucide-react';
import dynamic from 'next/dynamic';
const LoadingFallback = () => (
  <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
);
const AddTaskDialog = dynamic(() => import('./add-task-dialog').then(m => m.AddTaskDialog), { ssr: false, loading: () => <LoadingFallback /> });
const AddProjectDialog = dynamic(() => import('./add-project-dialog').then(m => m.AddProjectDialog), { ssr: false, loading: () => <LoadingFallback /> });
const ProjectFilesDialog = dynamic(() => import('./project-files-dialog').then(m => m.ProjectFilesDialog), { ssr: false, loading: () => <LoadingFallback /> });
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser as useAuthUser } from '@/firebase';
import { collection, doc, writeBatch, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useNotifications } from '../notifications/notifications-provider';

const AiFollowUpSuggestions = dynamic(() => import('./ai-follow-up-suggestions').then(m => m.AiFollowUpSuggestions), { ssr: false });

const addDocumentNonBlocking = (ref: any, data: any) => {
    return addDoc(ref, data).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: ref.path,
            operation: 'create',
            requestResourceData: data,
        }));
        throw err;
    });
};

const updateDocumentNonBlocking = (ref: any, data: any) => {
    return updateDoc(ref, data).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: ref.path,
            operation: 'update',
            requestResourceData: data,
        }));
        throw err;
    });
};

const deleteDocumentNonBlocking = (ref: any) => {
    return deleteDoc(ref).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: ref.path,
            operation: 'delete',
        }));
        throw err;
    });
};


export function KanbanBoard() {
  const firestore = useFirestore();
  const { user: authUser } = useAuthUser();
  const { createNotification } = useNotifications();

  const userProfileQuery = useMemoFirebase(() => firestore && authUser ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: userProfile, isLoading: isLoadingUserProfile } = useDoc<User>(userProfileQuery);

  const projectsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'projects') : null, [firestore]);
  const { data: projectsData, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const areProjectsEqual = (a: Project[], b: Project[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].id !== b[i].id) return false;
      // compare key fields that might change ordering when updated
      if (a[i].name !== b[i].name) return false;
    }
    return true;
  };

  const stagesQuery = useMemoFirebase(() => firestore && selectedProject ? collection(firestore, 'projects', selectedProject.id, 'stages') : null, [firestore, selectedProject]);
  const { data: stagesData, isLoading: isLoadingStages } = useCollection<Stage>(stagesQuery);

  const tasksQuery = useMemoFirebase(() => {
    if (!firestore || !selectedProject || !userProfile) return null;
    
    const tasksCollection = collection(firestore, 'projects', selectedProject.id, 'tasks');
    
    if (userProfile.role === 'Gestor') {
      return tasksCollection;
    } else {
      return query(tasksCollection, where('assigneeId', '==', authUser?.uid));
    }
  }, [firestore, selectedProject, userProfile, authUser]);
  const { data: tasksData, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
  
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData } = useCollection<User>(usersQuery);
  const usersMap = useMemo(() => new Map(usersData?.map(user => [user.id, user])), [usersData]);
  
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [isProjectFilesDialogOpen, setIsProjectFilesDialogOpen] = useState(false);
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);

  const { toast } = useToast();

  // Preload dynamic components to avoid first-open delay
  useEffect(() => {
    Promise.allSettled([
      import('./add-task-dialog'),
      import('./add-project-dialog'),
      import('./project-files-dialog'),
      import('./ai-follow-up-suggestions'),
    ]);
  }, []);

  useEffect(() => {
    if (!projectsData) return;

    const nextSorted = [...projectsData].sort((a, b) => a.name.localeCompare(b.name));
    // Only update if order/content actually changed
    setProjects(prev => (areProjectsEqual(prev, nextSorted) ? prev : nextSorted));

    // Initialize selection
    if (!selectedProject) {
      if (nextSorted.length > 0) setSelectedProject(nextSorted[0]);
      return;
    }

    // Keep selectedProject in sync only when its data actually changed or was removed
    const match = nextSorted.find(p => p.id === selectedProject.id);
    if (!match) {
      setSelectedProject(nextSorted[0] ?? null);
    } else {
      if (match.name !== selectedProject.name) {
        setSelectedProject(match);
      }
    }
  }, [projectsData]);

  const handleSelectProject = useCallback((project: Project) => {
    setSelectedProject(project);
    setIsProjectSelectorOpen(false);
  }, []);

  const handleAddProject = async (newProject: Omit<Project, 'id'>) => {
    if (!firestore) return;
    const projectCollection = collection(firestore, 'projects');
    const newDocRef = await addDocumentNonBlocking(projectCollection, newProject);
    
    // Create default stages for the new project
    const batch = writeBatch(firestore);
    const stagesCollection = collection(firestore, 'projects', newDocRef.id, 'stages');
    const defaultStages = [
      { name: 'A Fazer', order: 1, description: 'Tarefas que ainda não foram iniciadas.' },
      { name: 'Em Progresso', order: 2, description: 'Tarefas que estão sendo trabalhadas ativamente.' },
      { name: 'Concluído', order: 3, description: 'Tarefas que foram finalizadas.' }
    ];
    defaultStages.forEach(stage => {
      const stageRef = doc(stagesCollection);
      batch.set(stageRef, {id: stageRef.id, ...stage});
    });
    await batch.commit();

    toast({
        title: "Projeto Adicionado",
        description: `O projeto "${newProject.name}" foi criado com sucesso.`
    });
    const newlyCreatedProject = { id: newDocRef.id, ...newProject };
    // The new project will appear via the realtime listener, and we can select it.
    handleSelectProject(newlyCreatedProject as Project)
  }

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'isCompleted'>, taskId?: string) => {
     if (!firestore || !selectedProject || !authUser) return;

    if (taskId) {
        // Update existing task
        const existingTask = tasksData?.find(t => t.id === taskId);
        const taskRef = doc(firestore, 'projects', selectedProject.id, 'tasks', taskId);
        updateDocumentNonBlocking(taskRef, taskData);

        // Notify on re-assignment
        if (taskData.assigneeId && taskData.assigneeId !== existingTask?.assigneeId) {
            const assignee = usersMap.get(taskData.assigneeId);
            createNotification(taskData.assigneeId, {
                title: 'Nova Tarefa Atribuída',
                message: `Você foi atribuído à tarefa "${taskData.name}" no projeto "${selectedProject.name}".`,
                link: `/projects?projectId=${selectedProject.id}&taskId=${taskId}`
            });
        }
        
        toast({
            title: "Tarefa Atualizada",
            description: `A tarefa "${taskData.name}" foi atualizada.`
        });
    } else {
        // Create new task
        const taskToAdd = {
            ...taskData,
            isCompleted: false,
        };
        const tasksCollection = collection(firestore, 'projects', selectedProject.id, 'tasks');
        addDocumentNonBlocking(tasksCollection, taskToAdd).then(docRef => {
            if (taskToAdd.assigneeId) {
                createNotification(taskToAdd.assigneeId, {
                    title: 'Nova Tarefa Atribuída',
                    message: `Você foi atribuído à tarefa "${taskToAdd.name}" no projeto "${selectedProject.name}".`,
                    link: `/projects?projectId=${selectedProject.id}&taskId=${docRef.id}`
                });
            }
        });
        toast({
            title: "Tarefa Adicionada",
            description: `A tarefa "${taskData.name}" foi criada com sucesso.`
        });
    }
  }

  const handleUpdateTaskStatus = useCallback((taskId: string, updates: Partial<Omit<Task, 'id'>>) => {
      if (!firestore || !selectedProject || !userProfile) return;
      const taskRef = doc(firestore, 'projects', selectedProject.id, 'tasks', taskId);
      updateDocumentNonBlocking(taskRef, updates);

      const task = tasksData?.find(t => t.id === taskId);
      if (task && updates.isCompleted) {
        const projectOwnerId = selectedProject.ownerId;
        const notificationReceivers = new Set<string>([projectOwnerId]);
        if(task.assigneeId) notificationReceivers.add(task.assigneeId);

        notificationReceivers.forEach(userId => {
            if (userId !== authUser?.uid) {
                createNotification(userId, {
                    title: 'Tarefa Concluída',
                    message: `A tarefa "${task.name}" foi concluída no projeto "${selectedProject.name}".`,
                    link: `/projects?projectId=${selectedProject.id}&taskId=${taskId}`
                });
            }
        });
      }

      toast({
          title: "Tarefa Atualizada",
          description: "O status da tarefa foi atualizado."
      });
  }, [firestore, selectedProject, userProfile, tasksData, authUser, createNotification, toast]);

  const handleDeleteTask = useCallback((taskId: string) => {
      if (!firestore || !selectedProject) return;
      const taskRef = doc(firestore, 'projects', selectedProject.id, 'tasks', taskId);
      deleteDocumentNonBlocking(taskRef);

      toast({
          title: "Tarefa Excluída",
          description: "A tarefa foi excluída com sucesso."
      });
  }, [firestore, selectedProject, toast]);
  
  const handleEditTask = useCallback((task: Task) => {
    setTaskToEdit(task);
    setIsTaskDialogOpen(true);
  }, []);

  const handleAddTaskClick = useCallback(() => {
    setTaskToEdit(null);
    setIsTaskDialogOpen(true);
  }, []);


  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (firestore && selectedProject && over && active.id !== over.id) {
        const taskId = active.id as string;
        const newStageId = over.id as string;
        
        handleUpdateTaskStatus(taskId, { stageId: newStageId });

        const stage = stagesData?.find(s => s.id === newStageId);
        toast({
            title: "Tarefa Movida",
            description: `A tarefa foi movida para a etapa "${stage?.name}".`,
        });
    }
  }, [firestore, selectedProject, stagesData, toast, handleUpdateTaskStatus]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const tasksWithDetails = useMemo(() => {
    if (!tasksData) return [];
    const taskMap = new Map(tasksData.map(task => [task.id, task]));
    return tasksData.map(task => {
        const dependencies = task.dependentTaskIds || [];
        const isLocked = dependencies.some(depId => {
            const dependentTask = taskMap.get(depId);
            return dependentTask && !dependentTask.isCompleted;
        });
        const assignee = task.assigneeId ? usersMap.get(task.assigneeId) : undefined;
        return { ...task, isLocked, assignee };
    });
  }, [tasksData, usersMap]);

  const stageTasksMap = useMemo(() => {
    const map = new Map<string, typeof tasksWithDetails>();
    for (const task of tasksWithDetails) {
      const list = map.get(task.stageId);
      if (list) {
        list.push(task);
      } else {
        map.set(task.stageId, [task]);
      }
    }
    return map;
  }, [tasksWithDetails]);

  const sortedStages = useMemo(() => {
    if (!stagesData) return [] as Stage[];
    return [...stagesData].sort((a,b) => a.order - b.order);
  }, [stagesData]);

  if (isLoadingProjects || isLoadingUserProfile) {
    return <div className="flex justify-center items-center h-full">Carregando...</div>;
  }
  
  if (projects.length === 0) {
      return (
          <>
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <h2 className="text-2xl font-semibold">Nenhum projeto encontrado</h2>
                <p className="text-muted-foreground">Crie seu primeiro projeto para começar a gerenciar tarefas.</p>
                <Button onClick={() => setIsAddProjectDialogOpen(true)}>
                    <FolderPlus className='mr-2' />
                    Criar Novo Projeto
                </Button>
            </div>
            <AddProjectDialog
                isOpen={isAddProjectDialogOpen}
                onOpenChange={setIsAddProjectDialogOpen}
                onAddProject={handleAddProject}
            />
          </>
      )
  }

  return (
    <>
        <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
            <div className='mb-4 flex flex-wrap justify-between items-center gap-4'>
                <Popover open={isProjectSelectorOpen} onOpenChange={setIsProjectSelectorOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={isProjectSelectorOpen} className="w-full sm:w-[300px] justify-between text-lg font-semibold">
                            {selectedProject?.name || "Selecione um Projeto"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Procurar projeto..." />
                            <CommandList>
                                <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
                                <CommandGroup>
                                    {projects.map((project) => (
                                        <CommandItem key={project.id} onSelect={() => handleSelectProject(project)}>
                                            {project.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                <div className='flex items-center gap-2'>
                    <Button onClick={() => setIsAddProjectDialogOpen(true)} variant="outline">
                        <FolderPlus className='mr-2' />
                        Novo Projeto
                    </Button>
                    <Button onClick={() => setIsProjectFilesDialogOpen(true)} variant="outline" disabled={!selectedProject}>
                        <Files className='mr-2' />
                        Arquivos
                    </Button>
                    <Button onClick={handleAddTaskClick} disabled={!selectedProject}>
                        <Plus className='mr-2' />
                        Adicionar Tarefa
                    </Button>
                </div>
            </div>
            {selectedProject && <AiFollowUpSuggestions project={selectedProject} />}

            <div className="flex h-full min-w-max gap-4 pb-4 overflow-x-auto">
                {isLoadingStages || isLoadingTasks ? (
                  <div className="flex justify-center items-center w-full">Carregando tarefas...</div>
                ) : (
                  sortedStages.map(stage => (
                    <KanbanColumn
                        key={stage.id}
                        stage={stage}
                        tasks={stageTasksMap.get(stage.id) || []}
                        onUpdateTask={handleUpdateTaskStatus}
                        onDeleteTask={handleDeleteTask}
                        onEditTask={handleEditTask}
                    />
                  ))
                )}
            </div>
        </DndContext>
        <AddTaskDialog 
            isOpen={isTaskDialogOpen}
            onOpenChange={setIsTaskDialogOpen}
            stages={sortedStages}
            tasks={tasksData || []}
            onSaveTask={handleSaveTask}
            projectId={selectedProject?.id || ''}
            taskToEdit={taskToEdit}
        />
        <AddProjectDialog
            isOpen={isAddProjectDialogOpen}
            onOpenChange={setIsAddProjectDialogOpen}
            onAddProject={handleAddProject}
        />
        <ProjectFilesDialog
            isOpen={isProjectFilesDialogOpen}
            onOpenChange={setIsProjectFilesDialogOpen}
            project={selectedProject}
        />
    </>
  );
}

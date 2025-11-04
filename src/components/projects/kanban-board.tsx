'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DndContext, type DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useToast } from '@/hooks/use-toast';
import { KanbanColumn } from './kanban-column';
import type { Task, Stage, Project, User, Role, Team } from '@/lib/types';
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
import { useCollection, useDoc, useFirestore, useUser as useAuthUser, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, query, where, serverTimestamp } from 'firebase/firestore';
import { useNotifications } from '../notifications/notifications-provider';
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const AiFollowUpSuggestions = dynamic(() => import('./ai-follow-up-suggestions').then(m => m.AiFollowUpSuggestions), { ssr: false });

export function KanbanBoard({ openNewProjectDialog }: { openNewProjectDialog?: boolean }) {
  const firestore = useFirestore();
  const { user: authUser } = useAuthUser();
  const { createNotification } = useNotifications();

  const userProfileQuery = React.useMemo(() => firestore && authUser?.uid ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser?.uid]);
  const { data: userProfile, isLoading: isLoadingUserProfile } = useDoc<User>(userProfileQuery);
  const userRoleId = userProfile?.roleId;

  const roleQuery = React.useMemo(() => firestore && userRoleId ? doc(firestore, 'roles', userRoleId) : null, [firestore, userRoleId]);
  const { data: role, isLoading: isLoadingRole } = useDoc<Role>(roleQuery);
  const isPrivilegedUser = role?.isDev || role?.isManager;


  const projectsQuery = React.useMemo(() => firestore ? collection(firestore, 'projects') : null, [firestore]);
  const { data: projectsData, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const [activeTab, setActiveTab] = useState<'execucao' | 'arquivado'>('execucao');

  const { projectsInExecution, projectsArchived } = useMemo(() => {
    const inExecution = projectsData?.filter(p => p.status !== 'Arquivado').sort((a,b) => a.name.localeCompare(b.name)) || [];
    const archived = projectsData?.filter(p => p.status === 'Arquivado').sort((a,b) => a.name.localeCompare(b.name)) || [];
    return { projectsInExecution: inExecution, projectsArchived: archived };
  }, [projectsData]);

  const projects = activeTab === 'execucao' ? projectsInExecution : projectsArchived;

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const stagesQuery = React.useMemo(() => firestore && selectedProject ? collection(firestore, 'projects', selectedProject.id, 'stages') : null, [firestore, selectedProject?.id]);
  const { data: stagesData, isLoading: isLoadingStages } = useCollection<Stage>(stagesQuery);

  const tasksQuery = React.useMemo(() => {
    if (!firestore || !selectedProject?.id || !role || !authUser?.uid) return null;
    
    const tasksCollection = collection(firestore, 'projects', selectedProject.id, 'tasks');
    
    if (isPrivilegedUser) {
      return tasksCollection;
    } else {
      return query(tasksCollection, where('assigneeId', '==', authUser?.uid));
    }
  }, [firestore, selectedProject?.id, role, authUser?.uid, isPrivilegedUser]);

  const { data: tasksData, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
  
  const usersQuery = React.useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData } = useCollection<User>(usersQuery);
  const usersMap = useMemo(() => new Map(usersData?.map(user => [user.id, user])), [usersData]);
  
  const teamsQuery = React.useMemo(() => firestore ? collection(firestore, 'teams') : null, [firestore]);
  const { data: teamsData } = useCollection<Team>(teamsQuery);
  const teamsMap = useMemo(() => new Map(teamsData?.map(team => [team.id, team])), [teamsData]);

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [dependencyForNewTask, setDependencyForNewTask] = useState<string | null>(null);
  
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [isProjectFilesDialogOpen, setIsProjectFilesDialogOpen] = useState(false);
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (openNewProjectDialog) {
      setProjectToEdit(null);
      setIsAddProjectDialogOpen(true);
    }
  }, [openNewProjectDialog]);

  useEffect(() => {
    const currentProjectList = activeTab === 'execucao' ? projectsInExecution : projectsArchived;
    if (selectedProject) {
        // If selected project is no longer in the current list, update selection
        if (!currentProjectList.find(p => p.id === selectedProject.id)) {
            setSelectedProject(currentProjectList[0] || null);
        }
    } else if (currentProjectList.length > 0) {
        // If no project is selected, select the first one
        setSelectedProject(currentProjectList[0]);
    } else {
        setSelectedProject(null);
    }
  }, [activeTab, projectsInExecution, projectsArchived, selectedProject]);


  const handleSelectProject = useCallback((project: Project) => {
    setSelectedProject(project);
    setIsProjectSelectorOpen(false);
  }, []);

  const handleAddProject = async (newProjectData: Omit<Project, 'id'>) => {
    if (!firestore) return;

    if (projectToEdit) { // Editing existing project
        const projectRef = doc(firestore, 'projects', projectToEdit.id);
        await updateDocumentNonBlocking(projectRef, newProjectData);
        toast({ title: "Projeto Atualizado", description: `O projeto "${newProjectData.name}" foi salvo.` });
        if (newProjectData.status === 'Arquivado' && activeTab === 'execucao') {
            setActiveTab('arquivado');
        } else if (newProjectData.status !== 'Arquivado' && activeTab === 'arquivado') {
            setActiveTab('execucao');
        }
    } else { // Creating new project
        const projectCollection = collection(firestore, 'projects');
        const newDocRef = await addDocumentNonBlocking(projectCollection, newProjectData);
        
        const stagesBatch = writeBatch(firestore);
        const stagesCollection = collection(firestore, 'projects', newDocRef.id, 'stages');
        const defaultStages = [
            { name: 'A Fazer', order: 1, description: 'Tarefas que ainda não foram iniciadas.' },
            { name: 'Em Progresso', order: 2, description: 'Tarefas que estão sendo trabalhadas ativamente.' },
            { name: 'Concluído', order: 3, description: 'Tarefas que foram finalizadas.' }
        ];

        const stageRefs = defaultStages.map(() => doc(stagesCollection));
        stageRefs.forEach((ref, index) => {
            stagesBatch.set(ref, { id: ref.id, ...defaultStages[index] });
        });
        await stagesBatch.commit();

        const tasksBatch = writeBatch(firestore);
        const tasksCollection = collection(firestore, 'projects', newDocRef.id, 'tasks');
        const toDoStage = stageRefs.find((_, index) => defaultStages[index].name === 'A Fazer');
        
        if (toDoStage) {
            const task1Ref = doc(tasksCollection);
            tasksBatch.set(task1Ref, { name: "Levantamento de dados dos clientes", stageId: toDoStage.id, projectId: newDocRef.id, isCompleted: false, createdAt: serverTimestamp(), description: "" });
            
            const task2Ref = doc(tasksCollection);
            tasksBatch.set(task2Ref, { name: "Organização e higienização dos dados", stageId: toDoStage.id, projectId: newDocRef.id, isCompleted: false, dependentTaskIds: [task1Ref.id], createdAt: serverTimestamp(), description: "" });
            
            const task3Ref = doc(tasksCollection);
            tasksBatch.set(task3Ref, { name: "Upload dos dados atualizados no sistema", stageId: toDoStage.id, projectId: newDocRef.id, isCompleted: false, dependentTaskIds: [task2Ref.id], createdAt: serverTimestamp(), description: "" });
            
            await tasksBatch.commit();
        }

        toast({
            title: "Projeto Adicionado",
            description: `O projeto "${newProjectData.name}" foi criado com sucesso e tarefas iniciais foram geradas.`
        });
        const newlyCreatedProject = { id: newDocRef.id, ...newProjectData };
        handleSelectProject(newlyCreatedProject as Project);
    }
  }

  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'isCompleted'>, taskId?: string) => {
     if (!firestore || !selectedProject || !authUser) return;

    if (taskId) {
        // Update existing task
        const existingTask = tasksData?.find(t => t.id === taskId);
        const taskRef = doc(firestore, 'projects', selectedProject.id, 'tasks', taskId);
        await updateDocumentNonBlocking(taskRef, taskData as any);

        // Notify on re-assignment
        if (taskData.assigneeId && taskData.assigneeId !== existingTask?.assigneeId) {
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
        addDocumentNonBlocking(tasksCollection, taskToAdd as any).then(docRef => {
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

  const handleUpdateTaskStatus = useCallback(async (taskId: string, updates: Partial<Omit<Task, 'id'>>) => {
      if (!firestore || !selectedProject || !authUser) return;
      const taskRef = doc(firestore, 'projects', selectedProject.id, 'tasks', taskId);
      await updateDocumentNonBlocking(taskRef, updates as any);

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
  }, [firestore, selectedProject, tasksData, authUser, createNotification, toast]);

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
    setDependencyForNewTask(null);
    setIsTaskDialogOpen(true);
  }, []);

  const handleAddTaskClick = useCallback(() => {
    setTaskToEdit(null);
    setDependencyForNewTask(null);
    setIsTaskDialogOpen(true);
  }, []);
  
  const handleEditProjectClick = useCallback(() => {
    setProjectToEdit(selectedProject);
    setIsAddProjectDialogOpen(true);
  }, [selectedProject]);

  const handleAddDependentTask = useCallback((dependencyId: string) => {
    setTaskToEdit(null);
    setDependencyForNewTask(dependencyId);
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
        const team = task.teamId ? teamsMap.get(task.teamId) : undefined;
        return { ...task, isLocked, assignee, team };
    });
  }, [tasksData, usersMap, teamsMap]);

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

  if (isLoadingProjects || isLoadingUserProfile || isLoadingRole) {
    return <div className="flex justify-center items-center h-full">Carregando...</div>;
  }
  
  if (projectsData?.length === 0) {
      return (
          <>
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <h2 className="text-2xl font-semibold">Nenhum projeto encontrado</h2>
                <p className="text-muted-foreground">Crie seu primeiro projeto para começar a gerenciar tarefas.</p>
                <Button onClick={() => { setProjectToEdit(null); setIsAddProjectDialogOpen(true); }}>
                    <FolderPlus className='mr-2' />
                    Criar Novo Projeto
                </Button>
            </div>
            <AddProjectDialog
                isOpen={isAddProjectDialogOpen}
                onOpenChange={setIsAddProjectDialogOpen}
                onAddProject={handleAddProject}
                projectToEdit={projectToEdit}
            />
          </>
      )
  }

  return (
    <>
        <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
            <div className='mb-4 flex flex-wrap justify-between items-center gap-4'>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
                  <TabsList>
                    <TabsTrigger value="execucao">Em Execução</TabsTrigger>
                    <TabsTrigger value="arquivado">Arquivados</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className='flex items-center gap-2'>
                  {projects.length > 0 && (
                    <Popover open={isProjectSelectorOpen} onOpenChange={setIsProjectSelectorOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={isProjectSelectorOpen} className="w-full sm:w-[250px] justify-between font-semibold">
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
                  )}
                    <Button onClick={() => { setProjectToEdit(null); setIsAddProjectDialogOpen(true); }} variant="outline">
                        <FolderPlus size={16} />
                    </Button>
                    <Button onClick={() => setIsProjectFilesDialogOpen(true)} variant="outline" disabled={!selectedProject}>
                        <Files size={16} />
                    </Button>
                    <Button onClick={handleAddTaskClick} disabled={!selectedProject}>
                        <Plus size={16} />
                    </Button>
                    <Button onClick={handleEditProjectClick} disabled={!selectedProject} variant="outline">
                        Editar Projeto
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
                        onAddDependentTask={handleAddDependentTask}
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
            dependencyId={dependencyForNewTask}
        />
        <AddProjectDialog
            isOpen={isAddProjectDialogOpen}
            onOpenChange={setIsAddProjectDialogOpen}
            onAddProject={handleAddProject}
            projectToEdit={projectToEdit}
        />
        <ProjectFilesDialog
            isOpen={isProjectFilesDialogOpen}
            onOpenChange={setIsProjectFilesDialogOpen}
            project={selectedProject}
        />
    </>
  );
}

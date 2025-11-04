'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DndContext, type DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useToast } from '@/hooks/use-toast';
import { KanbanColumn } from './kanban-column';
import type { Task, Stage, Project, User, Role, Team } from '@/lib/types';
import { Button } from '../ui/button';
import { Plus, FolderPlus, Files } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCollection, useDoc, useFirestore, useUser as useAuthUser, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, query, where, serverTimestamp, or } from 'firebase/firestore';
import { useNotifications } from '../notifications/notifications-provider';
import React from 'react';
import { Skeleton } from '../ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSearchParams } from 'next/navigation';


const LoadingFallback = () => (
  <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
);
const AddTaskDialog = dynamic(() => import('./add-task-dialog').then(m => m.AddTaskDialog), { ssr: false, loading: () => <LoadingFallback /> });
const AddProjectDialog = dynamic(() => import('./add-project-dialog').then(m => m.AddProjectDialog), { ssr: false, loading: () => <LoadingFallback /> });
const ProjectFilesDialog = dynamic(() => import('./project-files-dialog').then(m => m.ProjectFilesDialog), { ssr: false, loading: () => <LoadingFallback /> });
const AiFollowUpSuggestions = dynamic(() => import('./ai-follow-up-suggestions').then(m => m.AiFollowUpSuggestions), { ssr: false });

export function KanbanBoard({ openNewProjectDialog }: { openNewProjectDialog?: boolean }) {
  const firestore = useFirestore();
  const { user: authUser } = useAuthUser();
  const { createNotification } = useNotifications();
  const searchParams = useSearchParams();

  const userProfileQuery = React.useMemo(() => firestore && authUser?.uid ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser?.uid]);
  const { data: userProfile, isLoading: isLoadingUserProfile } = useDoc<User>(userProfileQuery);
  const userRoleId = userProfile?.roleId;

  const roleQuery = React.useMemo(() => firestore && userRoleId ? doc(firestore, 'roles', userRoleId) : null, [firestore, userRoleId]);
  const { data: role, isLoading: isLoadingRole } = useDoc<Role>(roleQuery);
  const isPrivilegedUser = role?.isManager || role?.isDev;

  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser || !role) return null;
    const projectsCollection = collection(firestore, 'projects');
    if (isPrivilegedUser) {
        return query(projectsCollection, where('status', '!=', 'Arquivado'));
    }
    return query(
        projectsCollection,
        where('status', '!=', 'Arquivado'),
        or(
            where('ownerId', '==', authUser.uid),
            where('teamMembers', 'array-contains', authUser.uid)
        )
    );
  }, [firestore, authUser, role, isPrivilegedUser]);
  
  const { data: projectsData, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const selectedProject = useMemo(() => {
    return projectsData?.find(p => p.id === selectedProjectId) || null;
  }, [projectsData, selectedProjectId]);


  const stagesQuery = React.useMemo(() => firestore && selectedProject ? collection(firestore, 'projects', selectedProject.id, 'stages') : null, [firestore, selectedProject?.id]);
  const { data: stagesData, isLoading: isLoadingStages } = useCollection<Stage>(stagesQuery);

  const tasksQuery = React.useMemo(() => {
    if (!firestore || !selectedProject?.id || !role || !authUser?.uid) return null;
    
    const tasksCollection = collection(firestore, 'projects', selectedProject.id, 'tasks');
    
    if (isPrivilegedUser) {
      return tasksCollection;
    } else {
      return query(tasksCollection, or(
          where('assigneeId', '==', authUser?.uid),
          where('teamId', 'in', userProfile?.teamIds || ['dummy-id-to-avoid-empty-in'])
      ));
    }
  }, [firestore, selectedProject?.id, role, authUser?.uid, isPrivilegedUser, userProfile?.teamIds]);

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
  
  const { toast } = useToast();

  useEffect(() => {
    if (openNewProjectDialog) {
      setProjectToEdit(null);
      setIsAddProjectDialogOpen(true);
    }
  }, [openNewProjectDialog]);

  useEffect(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    if (projectIdFromUrl && projectsData?.some(p => p.id === projectIdFromUrl)) {
      setSelectedProjectId(projectIdFromUrl);
    } else if (projectsData && projectsData.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projectsData[0].id);
    }
  }, [projectsData, selectedProjectId, searchParams]);


  const handleAddProject = async (newProjectData: Omit<Project, 'id'>) => {
    if (!firestore) return;

    if (projectToEdit) { // Editing existing project
        const projectRef = doc(firestore, 'projects', projectToEdit.id);
        await updateDocumentNonBlocking(projectRef, newProjectData);
        toast({ title: "Projeto Atualizado", description: `O projeto "${newProjectData.name}" foi salvo.` });
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
        
        setSelectedProjectId(newDocRef.id);
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
      if (!firestore || !selectedProject || !isPrivilegedUser) return;
      const taskRef = doc(firestore, 'projects', selectedProject.id, 'tasks', taskId);
      deleteDocumentNonBlocking(taskRef);

      toast({
          title: "Tarefa Excluída",
          description: "A tarefa foi excluída com sucesso."
      });
  }, [firestore, selectedProject, toast, isPrivilegedUser]);
  
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
    if (!isPrivilegedUser) return;
    setProjectToEdit(selectedProject);
    setIsAddProjectDialogOpen(true);
  }, [selectedProject, isPrivilegedUser]);

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
    return <Skeleton className="w-full h-full" />;
  }
  
  if (projectsData?.length === 0 && isPrivilegedUser) {
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
  
  if (projectsData?.length === 0 && !isPrivilegedUser) {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
            <h2 className="text-2xl font-semibold">Nenhum projeto atribuído</h2>
            <p className="text-muted-foreground">Você ainda não foi adicionado a nenhum projeto.</p>
        </div>
    )
  }


  return (
    <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
      <div className='mb-4 flex flex-wrap justify-between items-center gap-4'>
         <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-full max-w-xs text-lg font-semibold">
            <SelectValue placeholder="Selecione um projeto..." />
          </SelectTrigger>
          <SelectContent>
            {projectsData?.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className='flex items-center gap-2'>
          <Button onClick={() => setIsProjectFilesDialogOpen(true)} variant="outline" size="sm" disabled={!selectedProject}>
            <Files size={16} className='mr-2' /> Arquivos
          </Button>
          {isPrivilegedUser && (
            <Button onClick={handleEditProjectClick} variant="outline" size="sm" disabled={!selectedProject}>
              Editar Projeto
            </Button>
          )}
            <Button onClick={handleAddTaskClick} size="sm" disabled={!selectedProject}>
            <Plus size={16} className='mr-2' /> Nova Tarefa
          </Button>
        </div>
      </div>
      {selectedProject && isPrivilegedUser && <AiFollowUpSuggestions project={selectedProject} />}

      <div className="flex flex-1 min-w-max gap-4 pb-4 overflow-x-auto">
        {isLoadingStages || isLoadingTasks ? (
          Array.from({length: 3}).map((_, i) => (
            <div key={i} className="w-80 shrink-0">
              <Skeleton className="h-8 w-1/2 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ))
        ) : selectedProject ? (
          sortedStages.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              tasks={stageTasksMap.get(stage.id) || []}
              onUpdateTask={handleUpdateTaskStatus}
              onDeleteTask={isPrivilegedUser ? handleDeleteTask : () => {}}
              onEditTask={handleEditTask}
              onAddDependentTask={handleAddDependentTask}
            />
          ))
        ) : (
             <div className='flex flex-1 items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed'>
                <p className='text-muted-foreground'>Selecione um projeto para começar</p>
             </div>
        )}
      </div>

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
       {selectedProject && <ProjectFilesDialog
          isOpen={isProjectFilesDialogOpen}
          onOpenChange={setIsProjectFilesDialogOpen}
          project={selectedProject}
      />}
    </DndContext>
  );
}

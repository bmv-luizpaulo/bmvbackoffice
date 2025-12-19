'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  useFirestore,
  useCollection,
  useDoc,
  useUser as useAuthUser,
  useMemoFirebase,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, query, where, writeBatch, serverTimestamp, or, and } from 'firebase/firestore';
import type { Project, Stage, Task, User, Role, Team } from '@/lib/types';
import { KanbanColumn } from './kanban-column';
import { AddProjectDialog } from './add-project-dialog';
import { Button } from '../ui/button';
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { AddTaskDialog } from './add-task-dialog';
import { KanbanBoardSkeleton } from './kanban-board-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useRouter } from 'next/navigation';
import { AiFollowUpSuggestions } from './ai-follow-up-suggestions';
import { ProjectFilesDialog } from './project-files-dialog';
import { FolderOpen } from 'lucide-react';

export function KanbanBoard({ openNewProjectDialog }: { openNewProjectDialog?: boolean }) {
  const firestore = useFirestore();
  const { user: authUser } = useAuthUser();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const userProfileQuery = useMemoFirebase(() => (firestore && authUser?.uid ? doc(firestore, 'users', authUser.uid) : null), [firestore, authUser?.uid]);
  const { data: userProfile } = useDoc<User>(userProfileQuery);
  const roleQuery = useMemoFirebase(() => (firestore && userProfile?.roleId ? doc(firestore, 'roles', userProfile.roleId) : null), [firestore, userProfile?.roleId]);
  const { data: role } = useDoc<Role>(roleQuery as any);
  const isPrivilegedUser = role?.permissions?.isManager || role?.permissions?.isDev;

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isProjectModalOpen, setProjectModalOpen] = useState(!!openNewProjectDialog);
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [dependencyId, setDependencyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProjectFilesOpen, setIsProjectFilesOpen] = useState(false);


  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser || !role) return null;
    
    const projectsCollection = collection(firestore, 'projects');
    
    if (isPrivilegedUser) {
        return query(projectsCollection, where('status', '==', 'Em execução'));
    }
    
    return query(
        projectsCollection,
        and(
          where('status', '==', 'Em execução'),
          or(
              where('ownerId', '==', authUser.uid),
              where('teamMembers', 'array-contains', authUser.uid)
          )
        )
    );
  }, [firestore, authUser, role, isPrivilegedUser]);

  const { data: projectsData, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);
  
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  
  const teamsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'teams') : null, [firestore]);
  const { data: teamsData, isLoading: isLoadingTeams } = useCollection<Team>(teamsQuery);
  
  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

  const stagesQuery = useMemoFirebase(() => selectedProjectId ? query(collection(firestore, 'projects', selectedProjectId, 'stages')) : null, [selectedProjectId]);
  const { data: stagesData, isLoading: isLoadingStages } = useCollection<Stage>(stagesQuery);

  const tasksQuery = useMemoFirebase(() => selectedProjectId ? query(collection(firestore, 'projects', selectedProjectId, 'tasks')) : null, [selectedProjectId]);
  const { data: tasksData, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
  

  useEffect(() => {
    if (projectsData) setProjects(projectsData);
    if (usersData) setUsers(usersData);
    if (teamsData) setTeams(teamsData);
    if (stagesData) setStages(stagesData.sort((a, b) => a.order - b.order));
    if (tasksData) setTasks(tasksData);

    const anyLoading =
      isLoadingProjects ||
      isLoadingUsers ||
      isLoadingTeams ||
      (selectedProjectId && (isLoadingStages || isLoadingTasks));
    setIsLoading(!!anyLoading);

  }, [projectsData, usersData, teamsData, stagesData, tasksData, isLoadingProjects, isLoadingUsers, isLoadingTeams, isLoadingStages, isLoadingTasks, selectedProjectId]);

   useEffect(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    // Set project from URL if it's valid and not already set
    if (projectIdFromUrl && projectsData?.some(p => p.id === projectIdFromUrl) && selectedProjectId !== projectIdFromUrl) {
      setSelectedProjectId(projectIdFromUrl);
    // If no project is selected and data is available, select the first one
    } else if (!selectedProjectId && projectsData && projectsData.length > 0) {
      setSelectedProjectId(projectsData[0].id);
    }
  }, [searchParams, projectsData, selectedProjectId]);
  
  const usersMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const teamsMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);


  const tasksWithDetails = useMemo(() => {
    const allDependentIds = new Set(tasks.flatMap(t => t.dependentTaskIds || []));
    return tasks.map(task => {
        const isLocked = !task.isCompleted && (task.dependentTaskIds || []).some(depId => {
            const dependentTask = tasks.find(t => t.id === depId);
            return dependentTask && !dependentTask.isCompleted;
        });
        const hasDependents = allDependentIds.has(task.id);
        const assignee = task.assigneeId ? usersMap.get(task.assigneeId) : undefined;
        const team = task.teamId ? teamsMap.get(task.teamId) : undefined;
        return { ...task, isLocked, hasDependents, assignee, team };
    });
  }, [tasks, usersMap, teamsMap]);
  
  const handleAddProject = useCallback(async (newProjectData: Omit<Project, 'id'>) => {
    if (!firestore) return;
    const docRef = await addDocumentNonBlocking(collection(firestore, 'projects'), newProjectData);
    
    // Create default stages for the new project
    const stagesBatch = writeBatch(firestore);
    const stagesCollection = collection(firestore, 'projects', docRef.id, 'stages');
    const defaultStages = [
        { name: 'A Fazer', order: 1, description: 'Tarefas planejadas que ainda não foram iniciadas.' },
        { name: 'Em Progresso', order: 2, description: 'Tarefas que estão sendo trabalhadas ativamente.' },
        { name: 'Concluído', order: 3, description: 'Tarefas que foram finalizadas e entregues.' }
    ];
    defaultStages.forEach(stage => {
        const stageRef = doc(stagesCollection);
        stagesBatch.set(stageRef, stage);
    });
    await stagesBatch.commit();
    
    toast({ title: "Projeto Adicionado", description: `O projeto "${newProjectData.name}" foi criado com sucesso.`});
    setSelectedProjectId(docRef.id);
  }, [firestore, toast]);
  
  const handleSaveTask = useCallback(async (taskData: Omit<Task, 'id' | 'isCompleted'>, taskId?: string) => {
    if (!selectedProjectId || !firestore) return;

    if (taskId) {
        await updateDocumentNonBlocking(doc(firestore, `projects/${selectedProjectId}/tasks`, taskId), taskData);
        toast({ title: "Tarefa Atualizada", description: "As alterações na tarefa foram salvas." });
    } else {
        await addDocumentNonBlocking(collection(firestore, `projects/${selectedProjectId}/tasks`), {
            ...taskData,
            isCompleted: false,
            createdAt: serverTimestamp(),
        });
        toast({ title: "Tarefa Adicionada", description: "A nova tarefa foi adicionada ao projeto." });
    }
  }, [selectedProjectId, firestore, toast]);
  
  const handleUpdateTask = useCallback((taskId: string, updates: Partial<Omit<Task, 'id'>>) => {
      if (!selectedProjectId || !firestore) return;
      updateDocumentNonBlocking(doc(firestore, `projects/${selectedProjectId}/tasks`, taskId), updates);
  }, [selectedProjectId, firestore]);

  const handleDeleteTask = useCallback((taskId: string) => {
      if (!selectedProjectId || !firestore) return;
      deleteDocumentNonBlocking(doc(firestore, `projects/${selectedProjectId}/tasks`, taskId));
      toast({ title: "Tarefa Excluída", variant: "destructive" });
  }, [selectedProjectId, firestore, toast]);

  const handleDeleteProject = useCallback(() => {
    if (!selectedProjectId || !firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'projects', selectedProjectId));
    toast({ title: "Projeto Excluído", variant: "destructive" });
    setSelectedProjectId(projects.length > 1 ? projects.find(p => p.id !== selectedProjectId)!.id : null);
  }, [selectedProjectId, firestore, toast, projects]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(tasks.find(t => t.id === event.active.id) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
  };
  
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const isActiveATask = tasks.some(t => t.id === active.id);
    const isOverAStage = stages.some(s => s.id === over.id);

    if (isActiveATask && isOverAStage) {
        const task = tasks.find(t => t.id === active.id);
        if (task && task.stageId !== over.id) {
           handleUpdateTask(task.id, { stageId: over.id as string });
        }
    }
  };

  const handleEditTask = useCallback((task: Task) => {
    setTaskToEdit(task);
    setTaskModalOpen(true);
  }, []);

  const handleAddDependentTask = useCallback((dependencyId: string) => {
    setDependencyId(dependencyId);
    setTaskModalOpen(true);
  }, []);


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  if (isLoading) {
    return <KanbanBoardSkeleton />;
  }

  return (
    <>
      <div className='mb-4 flex flex-wrap justify-between items-center gap-4'>
        {projects.length > 0 ? (
          <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full md:w-auto md:min-w-64">
              <SelectValue placeholder="Selecione um projeto..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-muted-foreground">Nenhum projeto encontrado.</p>
        )}
        <div className='flex items-center gap-2'>
          {isPrivilegedUser && (
            <Button onClick={() => setProjectModalOpen(true)}>
              <Plus className='h-4 w-4 mr-2' /> Criar Projeto
            </Button>
          )}
           {selectedProject && (
              <Button variant="outline" size="icon" onClick={() => setIsProjectFilesOpen(true)}>
                <FolderOpen className='h-4 w-4' />
              </Button>
           )}
           {selectedProject && isPrivilegedUser && (
              <Button variant="outline" size="icon" disabled>
                  <SlidersHorizontal className='h-4 w-4' />
              </Button>
           )}
          {selectedProject && isPrivilegedUser && (
            <Button variant="destructive" size="icon" onClick={handleDeleteProject}>
              <Trash2 className='h-4 w-4' />
            </Button>
          )}
          {selectedProjectId && (
            <Button onClick={() => { setTaskToEdit(null); setTaskModalOpen(true); }}>
              <Plus className='h-4 w-4 mr-2' /> Nova Tarefa
            </Button>
          )}
        </div>
      </div>
      
      {selectedProject && <AiFollowUpSuggestions project={selectedProject} />}

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver} sensors={sensors}>
        <div className="flex h-full min-w-max gap-4 pb-4 overflow-x-auto">
          {stages.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              tasks={tasksWithDetails.filter(t => t.stageId === stage.id)}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onEditTask={handleEditTask}
              onAddDependentTask={handleAddDependentTask}
            />
          ))}
        </div>
      </DndContext>
      
      {isProjectModalOpen && (
        <AddProjectDialog
          isOpen={isProjectModalOpen}
          onOpenChange={setProjectModalOpen}
          onAddProject={handleAddProject}
        />
      )}

      {isTaskModalOpen && (
        <AddTaskDialog
          isOpen={isTaskModalOpen}
          onOpenChange={setTaskModalOpen}
          onSaveTask={handleSaveTask}
          stages={stages}
          tasks={tasks}
          projectId={selectedProjectId!}
          taskToEdit={taskToEdit}
          dependencyId={dependencyId}
        />
      )}

      {isProjectFilesOpen && selectedProject && (
        <ProjectFilesDialog
          isOpen={isProjectFilesOpen}
          onOpenChange={setIsProjectFilesOpen}
          project={selectedProject}
        />
      )}
    </>
  );
}

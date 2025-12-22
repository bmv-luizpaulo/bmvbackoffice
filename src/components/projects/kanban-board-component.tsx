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
  useUser,
  usePermissions,
  useMemoFirebase,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, query, writeBatch, serverTimestamp, orderBy } from 'firebase/firestore';
import type { Project, Stage, Task, User, Team } from '@/lib/types';
import { KanbanColumn } from './kanban-column';
import { AddProjectDialog } from './add-project-dialog';
import { Button } from '../ui/button';
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { AddTaskDialog } from './add-task-dialog';
import { KanbanBoardSkeleton } from './kanban-board-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { AiFollowUpSuggestions } from './ai-follow-up-suggestions';
import { ProjectFilesDialog } from './project-files-dialog';
import { FolderOpen } from 'lucide-react';
import { useUserProjects } from '@/hooks/useUserProjects';

export default function KanbanBoard({ openNewProjectDialog }: { openNewProjectDialog?: boolean }) {
  const firestore = useFirestore();
  const { isManager } = usePermissions();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isProjectModalOpen, setProjectModalOpen] = useState(!!openNewProjectDialog);
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [dependencyId, setDependencyId] = useState<string | null>(null);
  const [isProjectFilesOpen, setIsProjectFilesOpen] = useState(false);

  // --- Centralized Data Fetching ---
  const { projects: projectsData, isLoading: isLoadingProjects } = useUserProjects();
  
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  
  const teamsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'teams') : null, [firestore]);
  const { data: teams, isLoading: isLoadingTeams } = useCollection<Team>(teamsQuery);
  
  const stagesQuery = useMemoFirebase(() => selectedProjectId ? query(collection(firestore, 'projects', selectedProjectId, 'stages'), orderBy('order')) : null, [selectedProjectId, firestore]);
  const { data: stagesData, isLoading: isLoadingStages } = useCollection<Stage>(stagesQuery);

  const tasksQuery = useMemoFirebase(() => selectedProjectId ? query(collection(firestore, 'projects', selectedProjectId, 'tasks')) : null, [selectedProjectId, firestore]);
  const { data: tasksData, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
  
  const isLoading = isLoadingProjects || isLoadingUsers || isLoadingTeams || (selectedProjectId && (isLoadingStages || isLoadingTasks));

  // --- Memos and Effects ---
  const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);
  const teamsMap = useMemo(() => new Map(teams?.map(t => [t.id, t])), [teams]);
  const selectedProject = useMemo(() => projectsData?.find(p => p.id === selectedProjectId), [projectsData, selectedProjectId]);
  
  useEffect(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    if (projectsData && projectsData.length > 0) {
      if (projectIdFromUrl && projectsData.some(p => p.id === projectIdFromUrl)) {
        if(selectedProjectId !== projectIdFromUrl) setSelectedProjectId(projectIdFromUrl);
      } else if (!selectedProjectId) {
        setSelectedProjectId(projectsData[0].id);
      }
    } else if (!isLoadingProjects) {
        setSelectedProjectId(null);
    }
  }, [searchParams, projectsData, selectedProjectId, isLoadingProjects]);
  

  const tasksWithDetails = useMemo(() => {
    if (!tasksData) return [];
    const allDependentIds = new Set(tasksData.flatMap(t => t.dependentTaskIds || []));
    return tasksData.map(task => {
        const isLocked = !task.isCompleted && (task.dependentTaskIds || []).some(depId => {
            const dependentTask = tasksData.find(t => t.id === depId);
            return dependentTask && !dependentTask.isCompleted;
        });
        const hasDependents = allDependentIds.has(task.id);
        const assignee = task.assigneeId ? usersMap.get(task.assigneeId) : undefined;
        const team = task.teamId ? teamsMap.get(task.teamId) : undefined;
        return { ...task, isLocked, hasDependents, assignee, team };
    });
  }, [tasksData, usersMap, teamsMap]);
  
  // --- Handlers ---
  const handleAddProject = useCallback(async (newProjectData: Omit<Project, 'id'>) => {
    if (!firestore) return;
    const docRef = await addDocumentNonBlocking(collection(firestore, 'projects'), newProjectData);
    
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
    if (!selectedProjectId || !firestore || !projectsData) return;
    deleteDocumentNonBlocking(doc(firestore, 'projects', selectedProjectId));
    toast({ title: "Projeto Excluído", variant: "destructive" });
    setSelectedProjectId(projectsData.length > 1 ? projectsData.find(p => p.id !== selectedProjectId)!.id : null);
  }, [selectedProjectId, firestore, toast, projectsData]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(tasksData?.find(t => t.id === event.active.id) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
  };
  
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !tasksData || !stagesData) return;
    
    const isActiveATask = tasksData.some(t => t.id === active.id);
    const isOverAStage = stagesData.some(s => s.id === over.id);

    if (isActiveATask && isOverAStage) {
        const task = tasksData.find(t => t.id === active.id);
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
        {projectsData && projectsData.length > 0 ? (
          <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full md:w-auto md:min-w-64">
              <SelectValue placeholder="Selecione um projeto..." />
            </SelectTrigger>
            <SelectContent>
              {projectsData.map(project => (
                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-muted-foreground">Nenhum projeto encontrado.</p>
        )}
        <div className='flex items-center gap-2'>
          {isManager && (
            <Button onClick={() => setProjectModalOpen(true)}>
              <Plus className='h-4 w-4 mr-2' /> Criar Projeto
            </Button>
          )}
           {selectedProject && (
              <Button variant="outline" size="icon" onClick={() => setIsProjectFilesOpen(true)}>
                <FolderOpen className='h-4 w-4' />
              </Button>
           )}
           {selectedProject && isManager && (
              <Button variant="outline" size="icon" disabled>
                  <SlidersHorizontal className='h-4 w-4' />
              </Button>
           )}
          {selectedProject && isManager && (
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
          {stagesData?.map(stage => (
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
      
      <AddProjectDialog
        isOpen={isProjectModalOpen}
        onOpenChange={setProjectModalOpen}
        onAddProject={handleAddProject}
        usersData={users}
        teamsData={teams}
      />

      <AddTaskDialog
        isOpen={isTaskModalOpen}
        onOpenChange={setTaskModalOpen}
        onSaveTask={handleSaveTask}
        stages={stagesData || []}
        tasks={tasksData || []}
        usersData={users}
        teamsData={teams}
        projectId={selectedProjectId!}
        taskToEdit={taskToEdit}
        dependencyId={dependencyId}
      />

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

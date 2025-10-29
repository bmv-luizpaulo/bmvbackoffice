'use client';

import { useState, useEffect } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { useToast } from '@/hooks/use-toast';
import { KanbanColumn } from './kanban-column';
import type { Task, Stage, Project } from '@/lib/types';
import { Button } from '../ui/button';
import { Plus, FolderPlus, ChevronsUpDown } from 'lucide-react';
import { AddTaskDialog } from './add-task-dialog';
import { AddProjectDialog } from './add-project-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';


export function KanbanBoard() {
  const firestore = useFirestore();

  const projectsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'projects') : null, [firestore]);
  const { data: projectsData, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const stagesQuery = useMemoFirebase(() => firestore && selectedProject ? collection(firestore, 'projects', selectedProject.id, 'stages') : null, [firestore, selectedProject]);
  const { data: stagesData, isLoading: isLoadingStages } = useCollection<Stage>(stagesQuery);

  const tasksQuery = useMemoFirebase(() => firestore && selectedProject ? collection(firestore, 'projects', selectedProject.id, 'tasks') : null, [firestore, selectedProject]);
  const { data: tasksData, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
  
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (projectsData) {
      const sortedProjects = [...projectsData].sort((a, b) => a.name.localeCompare(b.name));
      setProjects(sortedProjects);
      if (!selectedProject && sortedProjects.length > 0) {
        setSelectedProject(sortedProjects[0]);
      } else if (selectedProject) {
        // refresh selected project data
        const refreshedProject = sortedProjects.find(p => p.id === selectedProject.id);
        if(refreshedProject) setSelectedProject(refreshedProject);
        else if(sortedProjects.length > 0) setSelectedProject(sortedProjects[0]);
        else setSelectedProject(null);
      }
    }
  }, [projectsData, selectedProject]);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setIsProjectSelectorOpen(false);
  }

  const handleAddProject = async (newProject: Omit<Project, 'id'>) => {
    if (!firestore) return;
    const projectCollection = collection(firestore, 'projects');
    const newDocRef = await addDocumentNonBlocking(projectCollection, newProject);
    
    // Create default stages for the new project
    const batch = writeBatch(firestore);
    const stagesCollection = collection(firestore, 'projects', newDocRef.id, 'stages');
    const defaultStages = [
      { name: 'A Fazer', order: 1 },
      { name: 'Em Progresso', order: 2 },
      { name: 'Concluído', order: 3 }
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

  const handleAddTask = (newTask: Omit<Task, 'id' | 'isCompleted'>) => {
     if (!firestore || !selectedProject) return;

    const taskToAdd = {
        ...newTask,
        isCompleted: false,
    };
    const tasksCollection = collection(firestore, 'projects', selectedProject.id, 'tasks');
    addDocumentNonBlocking(tasksCollection, taskToAdd);

    toast({
        title: "Tarefa Adicionada",
        description: `A tarefa "${newTask.name}" foi criada com sucesso.`
    })
  }

    const handleUpdateTask = (taskId: string, updates: Partial<Omit<Task, 'id'>>) => {
        if (!firestore || !selectedProject) return;
        const taskRef = doc(firestore, 'projects', selectedProject.id, 'tasks', taskId);
        updateDocumentNonBlocking(taskRef, updates);

        toast({
            title: "Tarefa Atualizada",
            description: "A tarefa foi atualizada com sucesso."
        });
    }

    const handleDeleteTask = (taskId: string) => {
        if (!firestore || !selectedProject) return;
        const taskRef = doc(firestore, 'projects', selectedProject.id, 'tasks', taskId);
        deleteDocumentNonBlocking(taskRef);

        toast({
            title: "Tarefa Excluída",
            description: "A tarefa foi excluída com sucesso."
        });
    }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (firestore && selectedProject && over && active.id !== over.id) {
        const taskId = active.id as string;
        const newStageId = over.id as string;
        
        handleUpdateTask(taskId, { stageId: newStageId });

        const stage = stagesData?.find(s => s.id === newStageId);
        toast({
            title: "Tarefa Movida",
            description: `A tarefa foi movida para a etapa "${stage?.name}".`,
        });
    }
  };
  
  const sortedStages = stagesData?.sort((a,b) => a.order - b.order) || [];

  if (isLoadingProjects) {
    return <div className="flex justify-center items-center h-full">Carregando projetos...</div>;
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
        <DndContext onDragEnd={handleDragEnd}>
            <div className='mb-4 flex justify-between items-center gap-4'>
                <Popover open={isProjectSelectorOpen} onOpenChange={setIsProjectSelectorOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={isProjectSelectorOpen} className="w-[300px] justify-between text-lg font-semibold">
                            {selectedProject?.name || "Selecione um Projeto"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
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
                    <Button onClick={() => setIsAddTaskDialogOpen(true)} disabled={!selectedProject}>
                        <Plus className='mr-2' />
                        Adicionar Tarefa
                    </Button>
                </div>
            </div>
            <div className="flex h-full min-w-max gap-4 pb-4 overflow-x-auto">
                {isLoadingStages || isLoadingTasks ? (
                  <div className="flex justify-center items-center w-full">Carregando tarefas...</div>
                ) : (
                  sortedStages.map(stage => (
                    <KanbanColumn
                        key={stage.id}
                        stage={stage}
                        tasks={tasksData?.filter(task => task.stageId === stage.id) || []}
                        onUpdateTask={handleUpdateTask}
                        onDeleteTask={handleDeleteTask}
                    />
                  ))
                )}
            </div>
        </DndContext>
        <AddTaskDialog 
            isOpen={isAddTaskDialogOpen}
            onOpenChange={setIsAddTaskDialogOpen}
            stages={sortedStages}
            onAddTask={handleAddTask}
            projectId={selectedProject?.id || ''}
        />
        <AddProjectDialog
            isOpen={isAddProjectDialogOpen}
            onOpenChange={setIsAddProjectDialogOpen}
            onAddProject={handleAddProject}
        />
    </>
  );
}

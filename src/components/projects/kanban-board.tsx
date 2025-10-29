'use client';

import { useState } from 'react';
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


// Dados mocados enquanto o backend não está conectado
const initialProjects: Project[] = [
    { id: 'proj-1', name: 'Projeto BMV Back Office', description: 'Desenvolvimento do novo sistema interno.', startDate: new Date().toISOString() },
    { id: 'proj-2', name: 'Campanha de Marketing Q3', description: 'Planejamento e execução da campanha de marketing para o terceiro trimestre.', startDate: new Date().toISOString() }
];

const initialStages: Stage[] = [
    { id: 'stage-1', name: 'A Fazer', order: 1, projectId: 'proj-1' },
    { id: 'stage-2', name: 'Em Progresso', order: 2, projectId: 'proj-1' },
    { id: 'stage-3', name: 'Concluído', order: 3, projectId: 'proj-1' },
    { id: 'stage-4', name: 'Planejamento', order: 1, projectId: 'proj-2' },
    { id: 'stage-5', name: 'Execução', order: 2, projectId: 'proj-2' },
    { id: 'stage-6', name: 'Análise', order: 3, projectId: 'proj-2' },
];

const initialTasks: Task[] = [
    { id: 'task-1', name: 'Configurar ambiente de desenvolvimento', description: 'Instalar todas as dependências necessárias.', projectId: 'proj-1', stageId: 'stage-1', isCompleted: false },
    { id: 'task-2', name: 'Desenvolver a interface do usuário', description: 'Criar os componentes de UI para o dashboard.', projectId: 'proj-1', stageId: 'stage-1', isCompleted: false },
    { id: 'task-3', name: 'Implementar autenticação', description: 'Configurar login com e-mail e senha.', projectId: 'proj-1', stageId: 'stage-2', isCompleted: false },
    { id: 'task-4', name: 'Realizar testes de unidade', description: 'Testar todos os componentes e funções.', projectId: 'proj-1', stageId: 'stage-3', isCompleted: true },
    { id: 'task-5', name: 'Definir KPIs da campanha', description: 'Estabelecer os indicadores chave de performance.', projectId: 'proj-2', stageId: 'stage-4', isCompleted: false },
    { id: 'task-6', name: 'Criar criativos para redes sociais', description: 'Desenvolver imagens e vídeos para as postagens.', projectId: 'proj-2', stageId: 'stage-5', isCompleted: false },
];

export function KanbanBoard() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProject, setSelectedProject] = useState<Project>(initialProjects[0]);
  const [stages, setStages] = useState<Stage[]>(initialStages.filter(s => s.projectId === selectedProject.id).sort((a,b) => a.order - b.order));
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);

  const { toast } = useToast();

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setStages(initialStages.filter(s => s.projectId === project.id).sort((a,b) => a.order - b.order));
    setIsProjectSelectorOpen(false);
  }

  const handleAddProject = (newProject: Omit<Project, 'id'>) => {
    const projectToAdd: Project = {
        ...newProject,
        id: `proj-${Date.now()}`
    };
    setProjects(prev => [...prev, projectToAdd]);
    toast({
        title: "Projeto Adicionado",
        description: `O projeto "${newProject.name}" foi criado com sucesso.`
    });
    handleSelectProject(projectToAdd);
  }

  const handleAddTask = (newTask: Omit<Task, 'id' | 'isCompleted'>) => {
    const taskToAdd: Task = {
        ...newTask,
        id: `task-${Date.now()}`,
        isCompleted: false,
    };
    setTasks(prev => [...prev, taskToAdd]);
    toast({
        title: "Tarefa Adicionada",
        description: `A tarefa "${newTask.name}" foi criada com sucesso.`
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
        const taskId = active.id as string;
        const newStageId = over.id as string;
        
        // Check if task exists in the current project context
        const taskExists = tasks.some(t => t.id === taskId && t.projectId === selectedProject.id);
        if (!taskExists) return;

        setTasks(prevTasks => {
            const taskIndex = prevTasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) return prevTasks;

            const updatedTask = { ...prevTasks[taskIndex], stageId: newStageId };
            const newTasks = [...prevTasks];
            newTasks[taskIndex] = updatedTask;
            
            const stage = stages.find(s => s.id === newStageId);
            toast({
                title: "Tarefa Movida",
                description: `A tarefa foi movida para a etapa "${stage?.name}".`,
            });
            
            return newTasks;
        });
    }
  };
  
  const projectTasks = tasks.filter(t => t.projectId === selectedProject.id);

  return (
    <>
        <DndContext onDragEnd={handleDragEnd}>
            <div className='mb-4 flex justify-between items-center gap-4'>
                <Popover open={isProjectSelectorOpen} onOpenChange={setIsProjectSelectorOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={isProjectSelectorOpen} className="w-[300px] justify-between text-lg font-semibold">
                            {selectedProject.name}
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
                    <Button onClick={() => setIsAddTaskDialogOpen(true)}>
                        <Plus className='mr-2' />
                        Adicionar Tarefa
                    </Button>
                </div>
            </div>
            <div className="flex h-full min-w-max gap-4 pb-4">
                {stages.map(stage => (
                <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    tasks={projectTasks.filter(task => task.stageId === stage.id)}
                />
                ))}
            </div>
        </DndContext>
        <AddTaskDialog 
            isOpen={isAddTaskDialogOpen}
            onOpenChange={setIsAddTaskDialogOpen}
            stages={stages}
            onAddTask={handleAddTask}
            projectId={selectedProject.id}
        />
        <AddProjectDialog
            isOpen={isAddProjectDialogOpen}
            onOpenChange={setIsAddProjectDialogOpen}
            onAddProject={handleAddProject}
        />
    </>
  );
}

'use client';

import { useState } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { useToast } from '@/hooks/use-toast';
import { KanbanColumn } from './kanban-column';
import type { Task, Stage } from '@/lib/types';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';
import { AddTaskDialog } from './add-task-dialog';


// Dados mocados enquanto o backend não está conectado
const initialStages: Stage[] = [
    { id: 'stage-1', name: 'A Fazer', order: 1, projectId: 'proj-1' },
    { id: 'stage-2', name: 'Em Progresso', order: 2, projectId: 'proj-1' },
    { id: 'stage-3', name: 'Concluído', order: 3, projectId: 'proj-1' },
];

const initialTasks: Task[] = [
    { id: 'task-1', name: 'Configurar ambiente de desenvolvimento', description: 'Instalar todas as dependências necessárias.', projectId: 'proj-1', stageId: 'stage-1', isCompleted: false },
    { id: 'task-2', name: 'Desenvolver a interface do usuário', description: 'Criar os componentes de UI para o dashboard.', projectId: 'proj-1', stageId: 'stage-1', isCompleted: false },
    { id: 'task-3', name: 'Implementar autenticação', description: 'Configurar login com e-mail e senha.', projectId: 'proj-1', stageId: 'stage-2', isCompleted: false },
    { id: 'task-4', name: 'Realizar testes de unidade', description: 'Testar todos os componentes e funções.', projectId: 'proj-1', stageId: 'stage-3', isCompleted: true },
];

export function KanbanBoard() {
  const [stages] = useState<Stage[]>(initialStages.sort((a,b) => a.order - b.order));
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

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

  return (
    <>
        <DndContext onDragEnd={handleDragEnd}>
            <div className='mb-4 flex justify-end'>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className='mr-2' />
                    Adicionar Tarefa
                </Button>
            </div>
            <div className="flex h-full min-w-max gap-4 pb-4">
                {stages.map(stage => (
                <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    tasks={tasks.filter(task => task.stageId === stage.id)}
                />
                ))}
            </div>
        </DndContext>
        <AddTaskDialog 
            isOpen={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            stages={stages}
            onAddTask={handleAddTask}
            // Supondo um único projeto por enquanto
            projectId="proj-1"
        />
    </>
  );
}

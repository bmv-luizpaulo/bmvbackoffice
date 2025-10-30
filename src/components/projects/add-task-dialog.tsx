'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, User, RefreshCcw } from "lucide-react";
import React from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Stage, Task, User as UserType } from "@/lib/types";
import { MultiSelect } from "../ui/multi-select";
import { useCollection, useFirestore } from "@/firebase";
import { collection } from "firebase/firestore";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";

type AddTaskDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveTask: (task: Omit<Task, 'id' | 'isCompleted'>, taskId?: string) => void;
  stages: Stage[];
  tasks: Task[];
  projectId: string;
  taskToEdit?: Task | null;
};

const formSchema = z.object({
  name: z.string().min(1, "O nome da tarefa é obrigatório."),
  description: z.string().optional(),
  stageId: z.string({ required_error: "A etapa é obrigatória." }),
  dependentTaskIds: z.array(z.string()).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.date().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(['diaria', 'semanal', 'mensal']).optional(),
  recurrenceEndDate: z.date().optional(),
}).refine(data => {
    if (data.isRecurring) {
        return !!data.recurrenceFrequency && !!data.recurrenceEndDate;
    }
    return true;
}, {
    message: "Frequência e data de término são obrigatórias para tarefas recorrentes.",
    path: ["recurrenceFrequency"],
});


export function AddTaskDialog({ isOpen, onOpenChange, onSaveTask, stages, tasks, projectId, taskToEdit }: AddTaskDialogProps) {
  const firestore = useFirestore();
  const usersQuery = React.useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData } = useCollection<UserType>(usersQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      dependentTaskIds: [],
      assigneeId: undefined,
      dueDate: undefined,
      isRecurring: false,
    },
  });

  const isRecurring = form.watch("isRecurring");

  // Reset form when dialog opens or taskToEdit changes
  React.useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        form.reset({
          name: taskToEdit.name,
          description: taskToEdit.description,
          stageId: taskToEdit.stageId,
          dependentTaskIds: taskToEdit.dependentTaskIds || [],
          assigneeId: taskToEdit.assigneeId,
          dueDate: taskToEdit.dueDate ? new Date(taskToEdit.dueDate) : undefined,
          isRecurring: taskToEdit.isRecurring || false,
          recurrenceFrequency: taskToEdit.recurrenceFrequency,
          recurrenceEndDate: taskToEdit.recurrenceEndDate ? new Date(taskToEdit.recurrenceEndDate) : undefined,
        });
      } else {
        form.reset({
          stageId: stages.length > 0 ? stages[0].id : '',
          name: '',
          description: '',
          dependentTaskIds: [],
          assigneeId: undefined,
          dueDate: undefined,
          isRecurring: false,
          recurrenceFrequency: undefined,
          recurrenceEndDate: undefined,
        });
      }
    }
  }, [isOpen, taskToEdit, form, stages]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    onSaveTask({ 
        ...values,
        projectId,
        description: values.description || '',
        dependentTaskIds: values.dependentTaskIds || [],
        dueDate: values.dueDate?.toISOString(),
        recurrenceEndDate: values.recurrenceEndDate?.toISOString(),
    }, taskToEdit?.id);
    onOpenChange(false);
  }
  
  const taskOptions = tasks
    .filter(task => !taskToEdit || task.id !== taskToEdit.id)
    .map(task => ({ value: task.id, label: task.name }));

  const userOptions = usersData?.map(user => ({ value: user.id, label: user.name })) || [];


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        onOpenChange(open);
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{taskToEdit ? 'Editar Tarefa' : 'Adicionar Nova Tarefa'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome da Tarefa</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Desenvolver página de login" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Adicione mais detalhes sobre a tarefa..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="stageId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Etapa</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma etapa" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {stages.map(stage => (
                                    <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="assigneeId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="flex items-center gap-2"><User className="h-4 w-4" />Responsável</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um responsável" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="unassigned">Não atribuído</SelectItem>
                                {userOptions.map(user => (
                                    <SelectItem key={user.value} value={user.value}>{user.label}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="dependentTaskIds"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Depende de</FormLabel>
                                <MultiSelect
                                    options={taskOptions}
                                    selected={field.value || []}
                                    onChange={field.onChange}
                                    placeholder="Selecione as tarefas..."
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Data de Entrega</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP", { locale: ptBR })
                                    ) : (
                                        <span>Escolha uma data</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    locale={ptBR}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                 </div>
                 <Separator />
                 <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="isRecurring"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel className="flex items-center gap-2"><RefreshCcw className="h-4 w-4"/>Tarefa Recorrente</FormLabel>
                                </div>
                                <FormControl>
                                    <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    {isRecurring && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border rounded-lg">
                             <FormField
                                control={form.control}
                                name="recurrenceFrequency"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Frequência</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a frequência" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="diaria">Diária</SelectItem>
                                            <SelectItem value="semanal">Semanal</SelectItem>
                                            <SelectItem value="mensal">Mensal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="recurrenceEndDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Data de Término</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(field.value, "PPP", { locale: ptBR })
                                            ) : (
                                                <span>Escolha uma data</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverContent>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            locale={ptBR}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                        </div>
                    )}
                 </div>
                <DialogFooter className="pt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Salvar Tarefa</Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    
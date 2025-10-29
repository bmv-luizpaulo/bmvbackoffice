'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import type { Stage, Task } from "@/lib/types";

type AddTaskDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddTask: (task: Omit<Task, 'id' | 'isCompleted'>) => void;
  stages: Stage[];
  projectId: string;
};

const formSchema = z.object({
  name: z.string().min(1, "O nome da tarefa é obrigatório."),
  description: z.string().optional(),
  stageId: z.string({ required_error: "A etapa é obrigatória." }),
});

export function AddTaskDialog({ isOpen, onOpenChange, onAddTask, stages, projectId }: AddTaskDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Reset form when dialog opens
  if (isOpen && !form.formState.isDirty) {
    form.reset({ stageId: stages.length > 0 ? stages[0].id : '' });
  }


  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddTask({ ...values, projectId, description: values.description || '' });
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            form.reset();
        }
        onOpenChange(open);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Nova Tarefa</DialogTitle>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        <FormLabel>Descrição (Opcional)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Adicione mais detalhes sobre a tarefa..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="stageId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Etapa</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione uma etapa inicial" />
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
                <DialogFooter className="pt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Adicionar Tarefa</Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

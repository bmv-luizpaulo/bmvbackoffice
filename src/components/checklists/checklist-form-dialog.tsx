'use client';

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
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
import type { Checklist, Team } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type ChecklistFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (checklist: Omit<Checklist, 'id'>, id?: string) => void;
  checklist?: Checklist | null;
  teams: Team[];
};

const formSchema = z.object({
  name: z.string().min(1, "O nome do checklist é obrigatório."),
  description: z.string().optional(),
  teamId: z.string({ required_error: "A equipe é obrigatória." }),
});

export function ChecklistFormDialog({ isOpen, onOpenChange, onSave, checklist, teams }: ChecklistFormDialogProps) {
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      if (checklist) {
        form.reset({
          name: checklist.name,
          description: checklist.description || '',
          teamId: checklist.teamId,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          teamId: undefined,
        });
      }
    }
  }, [checklist, form, isOpen]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values, checklist?.id);
    onOpenChange(false);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{checklist ? 'Editar Checklist' : 'Criar Novo Checklist'}</DialogTitle>
           <DialogDescription>
            Preencha os detalhes do checklist. Você poderá adicionar os passos após a criação.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome do Checklist</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Onboarding de Novo Cliente" {...field} />
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
                            <Textarea placeholder="Para que serve este checklist?" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="teamId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Equipe Responsável</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione uma equipe" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {teams.map(team => (
                                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
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
                    <Button type="submit">Salvar</Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    
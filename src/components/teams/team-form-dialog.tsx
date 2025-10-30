'use client';

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Users } from "lucide-react";

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
import type { Team, User } from "@/lib/types";
import { MultiSelect } from "../ui/multi-select";

type TeamFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (team: Omit<Team, 'id'>, teamId?: string) => void;
  team?: Team | null;
  users: User[];
  usersInTeam: User[];
};

const formSchema = z.object({
  name: z.string().min(1, "O nome da equipe é obrigatório."),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

const defaultValues = {
  name: '',
  description: '',
  memberIds: [],
};

export function TeamFormDialog({ isOpen, onOpenChange, onSave, team, users, usersInTeam }: TeamFormDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (isOpen) {
      if (team) {
         form.reset({
          name: team.name, 
          description: team.description || '', 
          memberIds: usersInTeam.map(u => u.id),
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [team, isOpen, form, usersInTeam]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    // We only pass back the team data. The parent component will handle user updates.
    const teamData = {
        name: values.name,
        description: values.description,
    }
    onSave(teamData, team?.id);
    onOpenChange(false);
  }
  
  const userOptions = React.useMemo(() => users.map(u => ({ value: u.id, label: u.name })), [users]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{team ? 'Editar Equipe' : 'Adicionar Nova Equipe'}</DialogTitle>
          <DialogDescription>
            Gerencie as informações e os membros da equipe aqui.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome da Equipe</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Contabilidade" {...field} />
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
                            <Textarea placeholder="Descreva as responsabilidades da equipe..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="memberIds"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2"><Users className="h-4 w-4" />Membros da Equipe</FormLabel>
                            <MultiSelect
                                options={userOptions}
                                selected={field.value || []}
                                onChange={field.onChange}
                                placeholder="Selecione os membros..."
                            />
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <DialogFooter>
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

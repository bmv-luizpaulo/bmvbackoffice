'use client';

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Users, User } from "lucide-react";

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
import type { Team, User as UserType, Role, Directorate } from "@/lib/types";
import { MultiSelect } from "../ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";

type TeamFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (teamData: Omit<Team, 'id'>, memberIds: string[], teamId?: string) => void;
  team?: Team | null;
  users: UserType[];
  usersInTeam: UserType[];
  roles: Role[];
};

const formSchema = z.object({
  name: z.string().min(1, "O nome da equipe é obrigatório."),
  description: z.string().optional(),
  leaderId: z.string().optional(),
  directorateId: z.string().optional(),
  teamType: z.enum(['Operacional', 'Técnica', 'Suporte', 'Projeto', 'Administrativa']).optional(),
  responsibilities: z.string().optional(),
  kpis: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

const defaultValues = {
  name: '',
  description: '',
  leaderId: undefined,
  directorateId: undefined,
  teamType: undefined,
  responsibilities: '',
  kpis: '',
  memberIds: [],
};

export function TeamFormDialog({ isOpen, onOpenChange, onSave, team, users, usersInTeam }: TeamFormDialogProps) {
  const firestore = useFirestore();
  const directoratesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'directorates') : null, [firestore]);
  const { data: directoratesData } = useCollection<Directorate>(directoratesQuery);
  
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
          leaderId: team.leaderId || undefined,
          directorateId: team.directorateId,
          teamType: team.teamType,
          responsibilities: team.responsibilities || '',
          kpis: team.kpis || '',
          memberIds: usersInTeam.map(u => u.id),
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [team, isOpen, form, usersInTeam]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const teamData = {
      name: values.name,
      description: values.description,
      leaderId: values.leaderId === 'unassigned' ? undefined : values.leaderId,
      directorateId: values.directorateId === 'unassigned' ? undefined : values.directorateId,
      teamType: values.teamType,
      responsibilities: values.responsibilities,
      kpis: values.kpis,
    };
    const memberIds = values.memberIds || [];
    onSave(teamData, memberIds, team?.id);
    onOpenChange(false);
  }
  
  const userOptions = React.useMemo(() => users.map(u => ({ value: u.id, label: u.name })), [users]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{team ? 'Editar Equipe' : 'Adicionar Nova Equipe'}</DialogTitle>
          <DialogDescription>
            Gerencie as informações e os membros da equipe aqui.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
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
                        <FormLabel>Descrição da Equipe</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Descreva as responsabilidades da equipe..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="leaderId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2"><User className="h-4 w-4" /> Gestor / Líder da Equipe</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecione um líder" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="unassigned">Nenhum</SelectItem>
                                {userOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                      control={form.control}
                      name="directorateId"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Diretoria Vinculada</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                  <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma diretoria" />
                                  </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="unassigned">Nenhuma</SelectItem>
                                {directoratesData?.map(dir => (
                                    <SelectItem key={dir.id} value={dir.id}>{dir.name}</SelectItem>
                                ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                   <FormField
                      control={form.control}
                      name="teamType"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Tipo de Equipe</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                  <SelectTrigger>
                                  <SelectValue placeholder="Selecione um tipo" />
                                  </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Operacional">Operacional</SelectItem>
                                <SelectItem value="Técnica">Técnica</SelectItem>
                                <SelectItem value="Suporte">Suporte</SelectItem>
                                <SelectItem value="Projeto">Projeto</SelectItem>
                                <SelectItem value="Administrativa">Administrativa</SelectItem>
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                </div>
                 <FormField
                    control={form.control}
                    name="responsibilities"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Principais Responsabilidades</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Liste as principais responsabilidades da equipe..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="kpis"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Indicadores de Desempenho (KPIs)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Liste os KPIs da equipe, separados por vírgula..." {...field} />
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

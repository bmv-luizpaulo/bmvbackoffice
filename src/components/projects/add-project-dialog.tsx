'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

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
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Project, User as UserType, Team } from "@/lib/types";
import { MultiSelect } from "../ui/multi-select";
import { useCollection, useFirestore } from "@/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import React from "react";
import { formatPhone } from "@/lib/masks";

type AddProjectDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddProject: (project: Omit<Project, 'id'>) => void;
  projectToEdit?: Project | null;
};

const formSchema = z.object({
  name: z.string().min(1, "O nome do projeto é obrigatório."),
  description: z.string().optional(),
  ownerId: z.string({ required_error: "O responsável é obrigatório." }),
  teamMembers: z.array(z.string()).optional(),
  teamIds: z.array(z.string()).optional(),
  contactPhone: z.string().optional(),
  technicalDetails: z.string().optional(),
  status: z.enum(['Em execução', 'Arquivado']).default('Em execução'),
  dateRange: z.object({
      from: z.date({ required_error: "A data de início é obrigatória."}),
      to: z.date().optional(),
  }, { required_error: "O período do projeto é obrigatório."}),
}).refine(data => !data.dateRange.to || data.dateRange.to >= data.dateRange.from, {
  message: "A data de término deve ser igual ou posterior à data de início.",
  path: ["dateRange"],
});


export function AddProjectDialog({ isOpen, onOpenChange, onAddProject, projectToEdit }: AddProjectDialogProps) {
  const firestore = useFirestore();
  const usersQuery = React.useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData } = useCollection<UserType>(usersQuery);
  const teamsQuery = React.useMemo(() => firestore ? collection(firestore, 'teams') : null, [firestore]);
  const { data: teamsData } = useCollection<Team>(teamsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: "",
      description: "",
      teamMembers: [],
      teamIds: [],
      contactPhone: "",
      technicalDetails: "",
      status: 'Em execução',
      ownerId: undefined,
    },
  });

  const [showAllUsersPicker, setShowAllUsersPicker] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
        if (projectToEdit) {
            form.reset({
                name: projectToEdit.name,
                description: projectToEdit.description,
                ownerId: projectToEdit.ownerId,
                teamMembers: projectToEdit.teamMembers,
                teamIds: projectToEdit.teamIds || [],
                contactPhone: projectToEdit.contactPhone,
                technicalDetails: projectToEdit.technicalDetails,
                status: projectToEdit.status,
                dateRange: {
                    from: new Date(projectToEdit.startDate),
                    to: projectToEdit.endDate ? new Date(projectToEdit.endDate) : undefined
                }
            });
        } else {
            form.reset({
                name: "",
                description: "",
                teamMembers: [],
                teamIds: [],
                contactPhone: "",
                technicalDetails: "",
                status: 'Em execução',
                ownerId: undefined,
                dateRange: { from: undefined, to: undefined }
            });
        }
    }
  }, [isOpen, projectToEdit, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Denormaliza membros de equipes selecionadas
    let mergedMembers = new Set<string>(values.teamMembers || []);
    if (firestore && values.teamIds && values.teamIds.length) {
      const usersByTeamsQuery = query(collection(firestore, 'users'), where('teamIds', 'array-contains-any', values.teamIds.slice(0, 10)));
      const snap = await getDocs(usersByTeamsQuery);
      snap.forEach(doc => {
        const uid = doc.id;
        mergedMembers.add(uid);
      });
    }

    const projectData = {
        name: values.name,
        description: values.description || '',
        startDate: values.dateRange.from.toISOString(),
        endDate: values.dateRange.to?.toISOString(),
        ownerId: values.ownerId,
        teamMembers: Array.from(mergedMembers),
        teamIds: values.teamIds || [],
        contactPhone: values.contactPhone || '',
        technicalDetails: values.technicalDetails || '',
        status: values.status,
    };
    onAddProject(projectData);
    onOpenChange(false);
    form.reset();
  }

  const userOptions = (usersData?.map(user => ({ value: user.id, label: user.name })) || []).sort((a,b) => a.label.localeCompare(b.label));
  const teamOptions = teamsData?.map(team => ({ value: team.id, label: team.name })) || [];

  const selectedTeamIds = form.watch('teamIds') || [];
  const filteredUserOptions = React.useMemo(() => {
    if (showAllUsersPicker) {
      // Team-first sort when showing all users
      const teamIdSet = new Set(selectedTeamIds);
      return (usersData || [])
        .map(u => ({ value: u.id, label: u.name, fromTeam: (u.teamIds || []).some(tid => teamIdSet.has(tid)) }))
        .sort((a,b) => (a.fromTeam === b.fromTeam ? a.label.localeCompare(b.label) : (a.fromTeam ? -1 : 1)))
        .map(({value,label}) => ({ value, label }));
    }
    if (!selectedTeamIds?.length) return [];
    const setIds = new Set(selectedTeamIds);
    return (usersData || [])
      .filter(u => (u.teamIds || []).some(tid => setIds.has(tid)))
      .map(u => ({ value: u.id, label: u.name }))
      .sort((a,b) => a.label.localeCompare(b.label));
  }, [showAllUsersPicker, selectedTeamIds, usersData, userOptions]);

  // Helpers based on selected teams
  const teamMembersFromTeams = React.useMemo(() => {
    if (!selectedTeamIds?.length) return [] as { value: string; label: string }[];
    const setIds = new Set(selectedTeamIds);
    return (usersData || [])
      .filter(u => (u.teamIds || []).some(tid => setIds.has(tid)))
      .map(u => ({ value: u.id, label: u.name }));
  }, [selectedTeamIds, usersData]);

  const addAllTeamMembers = () => {
    const current = new Set(form.getValues('teamMembers') || []);
    teamMembersFromTeams.forEach(u => current.add(u.value));
    form.setValue('teamMembers', Array.from(current));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{projectToEdit ? 'Editar Projeto' : 'Criar Novo Projeto'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nome do Projeto</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Lançamento do novo App" {...field} />
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
                                    <Textarea placeholder="Adicione uma breve descrição do projeto..." {...field} rows={5} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dateRange"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Período do Projeto</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !field.value?.from && "text-muted-foreground"
                                            )}
                                            >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value?.from ? (
                                                field.value.to ? (
                                                <>
                                                    {format(field.value.from, "LLL dd, y", { locale: ptBR })} -{" "}
                                                    {format(field.value.to, "LLL dd, y", { locale: ptBR })}
                                                </>
                                                ) : (
                                                format(field.value.from, "LLL dd, y", { locale: ptBR })
                                                )
                                            ) : (
                                                <span>Escolha um período</span>
                                            )}
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={field.value?.from}
                                        selected={field.value as DateRange}
                                        onSelect={field.onChange}
                                        numberOfMonths={2}
                                        locale={ptBR}
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="space-y-6">
                         <FormField
                            control={form.control}
                            name="ownerId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="flex items-center gap-2"><User className="h-4 w-4" />Responsável pelo Projeto</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um responsável" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {userOptions.map(user => (
                                        <SelectItem key={user.value} value={user.value}>{user.label}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                          <FormField
                            control={form.control}
                            name="teamIds"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="flex items-center gap-2"><Users className="h-4 w-4" />Equipes</FormLabel>
                                    <MultiSelect
                                        options={teamOptions}
                                        selected={field.value || []}
                                        onChange={field.onChange}
                                        placeholder="Selecione equipes..."
                                    />
                                    <div className="mt-2 flex items-center justify-between">
                                      {!!(field.value || []).length ? (
                                        <>
                                          <div className="text-xs text-muted-foreground">
                                            Membros nas equipes: <strong>{teamMembersFromTeams.length}</strong>
                                          </div>
                                          <Button type="button" variant="outline" size="sm" onClick={addAllTeamMembers}>Adicionar todos os membros</Button>
                                        </>
                                      ) : (
                                        <div className="text-xs text-muted-foreground">Selecione uma ou mais equipes para listar membros.</div>
                                      )}
                                    </div>
                                    {!!(field.value || []).length && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {(field.value || []).map((tid: string) => {
                                          const label = teamOptions.find(t => t.value === tid)?.label || tid;
                                          return (
                                            <span key={tid} className="rounded-full bg-muted px-2 py-0.5 text-xs">{label}</span>
                                          );
                                        })}
                                      </div>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="teamMembers"
                            render={({ field }) => (
                                <FormItem>
                                <div className="flex items-center justify-between">
                                  <FormLabel className="flex items-center gap-2"><Users className="h-4 w-4" />Equipe Empenhada</FormLabel>
                                  <div className="space-x-2 text-xs">
                                    {!showAllUsersPicker ? (
                                      <Button type="button" variant="outline" size="sm" onClick={() => setShowAllUsersPicker(true)}>
                                        Adicionar usuário avulso ({Math.max((usersData?.length || 0) - (form.getValues('teamMembers')?.length || 0), 0)})
                                      </Button>
                                    ) : (
                                      <Button type="button" variant="secondary" size="sm" onClick={() => setShowAllUsersPicker(false)}>Voltar p/ equipes</Button>
                                    )}
                                  </div>
                                </div>
                                  <MultiSelect
                                      options={filteredUserOptions}
                                      selected={field.value || []}
                                      onChange={field.onChange}
                                      placeholder={showAllUsersPicker ? "Selecione pessoas (todos os usuários)..." : (selectedTeamIds.length ? "Selecione pessoas da(s) equipe(s)..." : "Selecione equipes primeiro...")}
                                  />
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    Selecionados: <strong>{(field.value || []).length}</strong>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="contactPhone"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Telefone de Contato</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="(XX) XXXXX-XXXX"
                                        {...field}
                                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="technicalDetails"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Detalhes Técnicos</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Stack de tecnologia, dependências, etc..." {...field} rows={1}/>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        {projectToEdit && (
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status do Projeto</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Selecione o status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Em execução">Em execução</SelectItem>
                                        <SelectItem value="Arquivado">Arquivado</SelectItem>
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        )}
                    </div>
                </div>

                <DialogFooter className="pt-4 gap-2">
                    <div className="mr-auto text-xs text-muted-foreground">
                      Equipes: <strong>{(form.watch('teamIds') || []).length}</strong> • Pessoas: <strong>{(form.watch('teamMembers') || []).length}</strong>
                    </div>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" disabled={!form.formState.isValid}>{projectToEdit ? 'Salvar Alterações' : 'Criar Projeto'}</Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

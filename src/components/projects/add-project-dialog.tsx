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
import type { Project, User as UserType } from "@/lib/types";
import { MultiSelect } from "../ui/multi-select";
import { useCollection, useFirestore } from "@/firebase";
import { collection } from "firebase/firestore";
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      teamMembers: [],
      contactPhone: "",
      technicalDetails: "",
      status: 'Em execução',
      ownerId: undefined,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
        if (projectToEdit) {
            form.reset({
                name: projectToEdit.name,
                description: projectToEdit.description,
                ownerId: projectToEdit.ownerId,
                teamMembers: projectToEdit.teamMembers,
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
                contactPhone: "",
                technicalDetails: "",
                status: 'Em execução',
                ownerId: undefined,
                dateRange: { from: undefined, to: undefined }
            });
        }
    }
  }, [isOpen, projectToEdit, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const projectData = {
        name: values.name,
        description: values.description || '',
        startDate: values.dateRange.from.toISOString(),
        endDate: values.dateRange.to?.toISOString(),
        ownerId: values.ownerId,
        teamMembers: values.teamMembers || [],
        contactPhone: values.contactPhone || '',
        technicalDetails: values.technicalDetails || '',
        status: values.status,
    };
    onAddProject(projectData);
    onOpenChange(false);
    form.reset();
  }

  const userOptions = usersData?.map(user => ({ value: user.id, label: user.name })) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
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
                            name="teamMembers"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="flex items-center gap-2"><Users className="h-4 w-4" />Equipe Empenhada</FormLabel>
                                    <MultiSelect
                                        options={userOptions}
                                        selected={field.value || []}
                                        onChange={field.onChange}
                                        placeholder="Selecione os membros da equipe..."
                                    />
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

                <DialogFooter className="pt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">{projectToEdit ? 'Salvar Alterações' : 'Criar Projeto'}</Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

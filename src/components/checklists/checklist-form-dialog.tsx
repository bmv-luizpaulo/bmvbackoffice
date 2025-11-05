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
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "../ui/calendar";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";

type ChecklistFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (checklist: Omit<Checklist, 'id' | 'creatorId' | 'createdAt'>, id?: string) => void;
  checklist?: Checklist | null;
  teams: Team[];
};

const formSchema = z.object({
  name: z.string().min(1, "O nome do checklist é obrigatório."),
  description: z.string().optional(),
  teamId: z.string({ required_error: "A equipe é obrigatória." }),
  status: z.enum(['ativo', 'arquivado']).default('ativo'),
  deadlineDate: z.date().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(['diaria', 'semanal', 'mensal']).optional(),
}).refine(data => {
    if (data.isRecurring) {
        return !!data.recurrenceFrequency;
    }
    return true;
}, {
    message: "A frequência é obrigatória para checklists recorrentes.",
    path: ["recurrenceFrequency"],
});

export function ChecklistFormDialog({ isOpen, onOpenChange, onSave, checklist, teams }: ChecklistFormDialogProps) {
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'ativo',
      isRecurring: false,
    }
  });

  const isRecurring = form.watch('isRecurring');

  React.useEffect(() => {
    if (isOpen) {
      if (checklist) {
        form.reset({
          name: checklist.name,
          description: checklist.description || '',
          teamId: checklist.teamId,
          status: checklist.status || 'ativo',
          deadlineDate: checklist.deadlineDate ? new Date(checklist.deadlineDate) : undefined,
          isRecurring: checklist.isRecurring || false,
          recurrenceFrequency: checklist.recurrenceFrequency,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          teamId: undefined,
          status: 'ativo',
          deadlineDate: undefined,
          isRecurring: false,
          recurrenceFrequency: undefined,
        });
      }
    }
  }, [checklist, form, isOpen]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const dataToSave = {
        ...values,
        deadlineDate: values.deadlineDate?.toISOString(),
        recurrenceFrequency: values.isRecurring ? values.recurrenceFrequency : undefined,
    };
     if (!dataToSave.isRecurring) {
      delete (dataToSave as Partial<typeof dataToSave>).recurrenceFrequency;
    }
    onSave(dataToSave, checklist?.id);
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
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
                <Separator />
                <div className="space-y-4">
                     <FormField
                        control={form.control}
                        name="deadlineDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Prazo Final (Opcional)</FormLabel>
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
                    <FormField
                        control={form.control}
                        name="isRecurring"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel className="flex items-center gap-2"><RefreshCcw className="h-4 w-4"/>Checklist Recorrente</FormLabel>
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
                    )}
                </div>

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

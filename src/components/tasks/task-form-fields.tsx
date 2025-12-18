
'use client';

import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { format, setHours, setMinutes } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, User, RefreshCcw, Users, Video, FolderKanban, Info } from "lucide-react";
import React from 'react';

import {
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
import type { User as UserType, Project } from "@/lib/types";
import { MultiSelect } from "../ui/multi-select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";

const formSchema = z.object({
  taskType: z.enum(['task', 'meeting']).default('task'),
  name: z.string().min(1, "O nome é obrigatório."),
  description: z.string().optional(),
  projectId: z.string().optional(),
  assignee: z.string().optional(),
  dueDate: z.date().optional(),
  meetLink: z.string().url("URL inválida.").optional().or(z.literal('')),
  participantIds: z.array(z.string()).optional(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(['diaria', 'semanal', 'mensal']).optional(),
  recurrenceEndDate: z.date().optional(),
});


type TaskFormFieldsProps = {
    form: UseFormReturn<z.infer<typeof formSchema>>;
    projectsData: Project[];
    usersData: UserType[];
}

export function TaskFormFields({ form, projectsData, usersData }: TaskFormFieldsProps) {
    
    const taskType = form.watch("taskType");
    const isRecurring = form.watch("isRecurring");

    const projectOptions = projectsData.map(p => ({ value: p.id, label: p.name }));
    const userOptions = usersData.map(u => ({ value: u.id, label: u.name }));
    const participantOptions = usersData.map(u => ({ value: u.id, label: u.name }));


    return (
        <div className="space-y-4">
             <FormField
                control={form.control}
                name="taskType"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Tipo de Item</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                        >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="task" />
                            </FormControl>
                            <FormLabel className="font-normal">Tarefa</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="meeting" />
                            </FormControl>
                            <FormLabel className="font-normal">Reunião</FormLabel>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                        <Input placeholder={taskType === 'meeting' ? "Ex: Reunião de alinhamento semanal" : "Ex: Desenvolver página de login"} {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                 <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Data e Hora</FormLabel>
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
                                    format(field.value, "PPP, HH:mm", { locale: ptBR })
                                ) : (
                                    <span>Escolha uma data e hora</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                    const currentValue = field.value || new Date();
                                    const newDate = date || currentValue;
                                    const updatedDate = setHours(setMinutes(newDate, currentValue.getMinutes()), currentValue.getHours());
                                    field.onChange(updatedDate);
                                }}
                                locale={ptBR}
                                initialFocus
                            />
                            <div className="p-3 border-t border-border">
                                <FormLabel>Hora</FormLabel>
                                <Input
                                    type="time"
                                    defaultValue={field.value ? format(field.value, "HH:mm") : "09:00"}
                                    onChange={(e) => {
                                        const [hours, minutes] = e.target.value.split(':').map(Number);
                                        const date = field.value || new Date();
                                        const newDate = setHours(setMinutes(date, minutes), hours);
                                        field.onChange(newDate);
                                    }}
                                />
                            </div>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                {taskType === 'task' && (
                    <FormField
                        control={form.control}
                        name="projectId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="flex items-center gap-2"><FolderKanban className="h-4 w-4" /> Projeto (Opcional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um projeto" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="unassigned">Nenhum</SelectItem>
                                {projectOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>

            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Descrição / Pauta</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Adicione mais detalhes, pautas ou notas..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            
            {taskType === 'meeting' && (
                <>
                    <FormField
                    control={form.control}
                    name="meetLink"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2"><Video className="h-4 w-4" /> Link da Reunião</FormLabel>
                        <FormControl>
                            <Input placeholder="https://meet.google.com/..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="participantIds"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2"><Users className="h-4 w-4" />Participantes</FormLabel>
                            <MultiSelect
                                options={participantOptions}
                                selected={field.value || []}
                                onChange={field.onChange}
                                placeholder="Selecione os participantes..."
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                </>
            )}

            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Info className="h-4 w-4"/>
                            <span>Opções Adicionais</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                         <FormField
                            control={form.control}
                            name="assignee"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Responsável</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Atribuir a..." />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="unassigned">Não atribuído</SelectItem>
                                    {userOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
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
                                        <FormLabel className="flex items-center gap-2"><RefreshCcw className="h-4 w-4"/>Item Recorrente</FormLabel>
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
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    )
}

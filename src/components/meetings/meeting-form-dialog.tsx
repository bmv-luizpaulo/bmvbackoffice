
'use client';

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format, setHours, setMinutes } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Users, Video, RefreshCcw, Bot, Wand2, Loader2 } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Meeting, User as UserType } from "@/lib/types";
import { MultiSelect } from "../ui/multi-select";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { Switch } from "../ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { parseMeetingDetails } from "@/ai/flows/parse-meeting-flow";

type MeetingFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (meeting: Omit<Meeting, 'id' | 'createdAt'>, meetingId?: string) => void;
  meeting?: Meeting | null;
  users: UserType[];
};

const formSchema = z.object({
  name: z.string().min(1, "O nome da reunião é obrigatório."),
  description: z.string().optional(),
  dueDate: z.date({ required_error: "A data da reunião é obrigatória." }),
  meetLink: z.string().url("URL do Google Meet inválida.").optional().or(z.literal('')),
  participantIds: z.array(z.string()).optional(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(['diaria', 'semanal', 'mensal']).optional(),
  recurrenceEndDate: z.date().optional(),
}).refine(data => {
    if (data.isRecurring) {
        return !!data.recurrenceFrequency && !!data.recurrenceEndDate;
    }
    return true;
}, {
    message: "Frequência e data de término são obrigatórias para reuniões recorrentes.",
    path: ["recurrenceFrequency"],
});

export function MeetingFormDialog({ isOpen, onOpenChange, onSave, meeting, users }: MeetingFormDialogProps) {
  const { toast } = useToast();
  const [isParsing, setIsParsing] = React.useState(false);
  const [meetingPaste, setMeetingPaste] = React.useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      participantIds: [],
      isRecurring: false,
      meetLink: "",
    },
  });

  const isRecurring = form.watch("isRecurring");

  React.useEffect(() => {
    if (isOpen) {
      if (meeting) {
        form.reset({
          name: meeting.name,
          description: meeting.description || '',
          dueDate: new Date(meeting.dueDate),
          meetLink: meeting.meetLink || '',
          participantIds: meeting.participantIds || [],
          isRecurring: meeting.isRecurring || false,
          recurrenceFrequency: meeting.recurrenceFrequency,
          recurrenceEndDate: meeting.recurrenceEndDate ? new Date(meeting.recurrenceEndDate) : undefined,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          dueDate: new Date(),
          meetLink: '',
          participantIds: [],
          isRecurring: false,
          recurrenceFrequency: undefined,
          recurrenceEndDate: undefined,
        });
      }
      setMeetingPaste("");
    }
  }, [meeting, isOpen, form]);

  const handleParseMeeting = async () => {
    if (!meetingPaste.trim()) return;
    setIsParsing(true);
    try {
        const result = await parseMeetingDetails(meetingPaste);
        if (result.name) form.setValue('name', result.name);
        if (result.startDate) form.setValue('dueDate', new Date(result.startDate));
        if (result.meetLink) form.setValue('meetLink', result.meetLink);
        toast({ title: "Dados da reunião extraídos com sucesso!" });
    } catch(e: any) {
        toast({ title: "Erro na Análise", description: e.message, variant: 'destructive' });
    } finally {
        setIsParsing(false);
    }
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    const meetingData = {
        ...values,
        dueDate: values.dueDate.toISOString(),
        recurrenceFrequency: values.isRecurring ? values.recurrenceFrequency : undefined,
        recurrenceEndDate: values.isRecurring && values.recurrenceEndDate ? values.recurrenceEndDate.toISOString() : undefined,
    };
     if (!meetingData.isRecurring) {
      delete (meetingData as Partial<typeof meetingData>).recurrenceFrequency;
      delete (meetingData as Partial<typeof meetingData>).recurrenceEndDate;
    }
    onSave(meetingData, meeting?.id);
    onOpenChange(false);
  }
  
  const participantOptions = users.map(u => ({ value: u.id, label: u.name }));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{meeting ? 'Editar Reunião' : 'Agendar Nova Reunião'}</DialogTitle>
           <DialogDescription>
            Preencha os detalhes para agendar uma nova reunião.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                 <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>
                            <div className="flex items-center gap-2 text-primary">
                                <Bot className="h-5 w-5"/>
                                <span className="font-semibold">Criar a partir de texto (com IA)</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 space-y-3">
                        <Textarea 
                            placeholder="Cole aqui o conteúdo de um convite de reunião (ex: do Google Calendar)..."
                            rows={8}
                            value={meetingPaste}
                            onChange={(e) => setMeetingPaste(e.target.value)}
                        />
                        <Button type="button" onClick={handleParseMeeting} disabled={isParsing || !meetingPaste.trim()}>
                                {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4" />}
                                Analisar e Preencher
                        </Button>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Título da Reunião</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Alinhamento semanal de projeto" {...field} />
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
                        <FormLabel>Pauta / Descrição</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Descreva os tópicos a serem discutidos..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
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
                                className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                {field.value ? format(field.value, "PPP, HH:mm", { locale: ptBR }) : <span>Escolha uma data</span>}
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
                            />
                            <div className="p-3 border-t border-border">
                                <FormLabel>Hora</FormLabel>
                                <Input
                                    type="time"
                                    defaultValue={field.value ? format(field.value, "HH:mm") : "09:00"}
                                    onChange={(e) => {
                                        const [hours, minutes] = e.target.value.split(':').map(Number);
                                        const date = field.value || new Date();
                                        field.onChange(setHours(setMinutes(date, minutes), hours));
                                    }}
                                />
                            </div>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="meetLink"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2"><Video className="h-4 w-4" /> Link do Google Meet</FormLabel>
                        <FormControl><Input placeholder="https://meet.google.com/..." {...field} /></FormControl>
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

                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="isRecurring"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5"><FormLabel className="flex items-center gap-2"><RefreshCcw className="h-4 w-4"/>Reunião Recorrente</FormLabel></div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}
                    />
                    {isRecurring && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border rounded-lg">
                             <FormField
                                control={form.control}
                                name="recurrenceFrequency"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Frequência</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Selecione a frequência" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="diaria">Diária</SelectItem>
                                        <SelectItem value="semanal">Semanal</SelectItem>
                                        <SelectItem value="mensal">Mensal</SelectItem>
                                    </SelectContent>
                                    </Select><FormMessage /></FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="recurrenceEndDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Data de Término</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild><FormControl>
                                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={ptBR}/>
                                        </PopoverContent>
                                    </Popover><FormMessage /></FormItem>
                                )}
                            />
                        </div>
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

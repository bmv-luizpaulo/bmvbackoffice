'use client';

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Asset, AssetMaintenance } from "@/lib/types";

type MaintenanceFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (maintenance: Omit<AssetMaintenance, 'id'>, id?: string) => void;
  maintenance?: AssetMaintenance | null;
  assets: Asset[];
};

const formSchema = z.object({
  assetId: z.string({ required_error: "É obrigatório selecionar um ativo." }),
  description: z.string().min(1, "A descrição do serviço é obrigatória."),
  status: z.enum(['Agendada', 'Em Andamento', 'Concluída', 'Cancelada']),
  scheduledDate: z.date({ required_error: "A data de agendamento é obrigatória." }),
  completedDate: z.date().optional(),
  cost: z.coerce.number().optional(),
}).refine(data => !data.completedDate || data.completedDate >= data.scheduledDate, {
  message: "A data de conclusão não pode ser anterior à data de agendamento.",
  path: ["completedDate"],
});


export function MaintenanceFormDialog({ isOpen, onOpenChange, onSave, maintenance, assets }: MaintenanceFormDialogProps) {
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        description: '',
        status: 'Agendada',
        cost: 0,
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      if (maintenance) {
        form.reset({
          ...maintenance,
          scheduledDate: new Date(maintenance.scheduledDate),
          completedDate: maintenance.completedDate ? new Date(maintenance.completedDate) : undefined,
          cost: maintenance.cost || 0,
        });
      } else {
        form.reset({
            assetId: undefined,
            description: '',
            status: 'Agendada',
            scheduledDate: new Date(),
            completedDate: undefined,
            cost: 0,
        });
      }
    }
  }, [maintenance, form, isOpen]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const maintenanceData = {
        ...values,
        scheduledDate: values.scheduledDate.toISOString(),
        completedDate: values.completedDate?.toISOString(),
    };
    onSave(maintenanceData, maintenance?.id);
    onOpenChange(false);
  }

  const status = form.watch('status');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{maintenance ? 'Editar Manutenção' : 'Agendar Nova Manutenção'}</DialogTitle>
          <DialogDescription>Preencha os detalhes do agendamento abaixo.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
                <FormField
                    control={form.control}
                    name="assetId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Ativo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o ativo para manutenção" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {assets.map(asset => (
                                    <SelectItem key={asset.id} value={asset.id}>{asset.name} ({asset.serialNumber || 'S/N'})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Descrição do Serviço</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Ex: Troca de tela, atualização de software, limpeza..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="scheduledDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Data Agendada</FormLabel>
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
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Agendada">Agendada</SelectItem>
                                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                                    <SelectItem value="Concluída">Concluída</SelectItem>
                                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 
                {(status === 'Concluída') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="completedDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Data de Conclusão</FormLabel>
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
                            name="cost"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Custo Final (R$)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Ex: 250.00" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
                
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

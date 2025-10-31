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
import type { Asset, User } from "@/lib/types";
import { Separator } from "../ui/separator";

type AssetFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (asset: Omit<Asset, 'id'>, assetId?: string) => void;
  asset?: Asset | null;
  users: User[];
};

const formSchema = z.object({
  name: z.string().min(1, "O nome do ativo é obrigatório."),
  description: z.string().optional(),
  serialNumber: z.string().optional(),
  type: z.enum(['Físico', 'Digital'], { required_error: "O tipo é obrigatório." }),
  status: z.enum(['Em Uso', 'Em Manutenção', 'Disponível', 'Descartado'], { required_error: "O status é obrigatório." }),
  location: z.string().optional(),
  purchaseDate: z.date().optional(),
  purchaseValue: z.coerce.number().optional(),
  assigneeId: z.string().optional(),
  lastMaintenanceDate: z.date().optional(),
  nextMaintenanceDate: z.date().optional(),
}).refine(data => !data.nextMaintenanceDate || !data.lastMaintenanceDate || data.nextMaintenanceDate > data.lastMaintenanceDate, {
    message: "A próxima manutenção deve ser após a última.",
    path: ["nextMaintenanceDate"],
});


export function AssetFormDialog({ isOpen, onOpenChange, onSave, asset, users }: AssetFormDialogProps) {
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: '',
        description: '',
        serialNumber: '',
        location: '',
        purchaseValue: 0,
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      if (asset) {
        form.reset({
          ...asset,
          purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : undefined,
          lastMaintenanceDate: asset.lastMaintenanceDate ? new Date(asset.lastMaintenanceDate) : undefined,
          nextMaintenanceDate: asset.nextMaintenanceDate ? new Date(asset.nextMaintenanceDate) : undefined,
          purchaseValue: asset.purchaseValue || 0,
        });
      } else {
        form.reset({
            name: '',
            description: '',
            serialNumber: '',
            location: '',
            purchaseDate: undefined,
            purchaseValue: 0,
            assigneeId: undefined,
            type: undefined,
            status: undefined,
            lastMaintenanceDate: undefined,
            nextMaintenanceDate: undefined,
        });
      }
    }
  }, [asset, form, isOpen]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const assetData = {
        ...values,
        purchaseDate: values.purchaseDate?.toISOString(),
        lastMaintenanceDate: values.lastMaintenanceDate?.toISOString(),
        nextMaintenanceDate: values.nextMaintenanceDate?.toISOString(),
    };
    onSave(assetData, asset?.id);
    onOpenChange(false);
  }
  
  const userOptions = users.map(u => ({ value: u.id, label: u.name }));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{asset ? 'Editar Ativo' : 'Adicionar Novo Ativo'}</DialogTitle>
          <DialogDescription>Preencha os detalhes do ativo abaixo.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome do Ativo</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Notebook Dell XPS 15" {...field} />
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
                            <Textarea placeholder="Descreva o ativo, suas especificações, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Físico">Físico</SelectItem>
                                    <SelectItem value="Digital">Digital</SelectItem>
                                </SelectContent>
                            </Select>
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
                                    <SelectItem value="Em Uso">Em Uso</SelectItem>
                                    <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                                    <SelectItem value="Disponível">Disponível</SelectItem>
                                    <SelectItem value="Descartado">Descartado</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="serialNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Nº de Série / Identificador</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: ABC123XYZ" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Localização</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Sala 301, AWS S3 Bucket" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="purchaseDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Data da Compra</FormLabel>
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
                        name="purchaseValue"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Valor de Compra (R$)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="Ex: 5000.00" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="assigneeId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Atribuído a</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um responsável" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="">Ninguém</SelectItem>
                                {userOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <Separator />
                <div>
                  <h3 className="text-base font-medium mb-2">Manutenção</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="lastMaintenanceDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Última Manutenção</FormLabel>
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
                        name="nextMaintenanceDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Próxima Manutenção</FormLabel>
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

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
  DialogDescription
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
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Seal, Product, Contact } from "@/lib/types";

type SealFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (seal: Omit<Seal, 'id'>, sealId?: string) => void;
  seal?: Seal | null;
  products: Product[];
  contacts: Contact[];
};

const formSchema = z.object({
  productId: z.string({ required_error: "O produto é obrigatório." }),
  contactId: z.string({ required_error: "O cliente é obrigatório." }),
  issueDate: z.date({ required_error: "A data de emissão é obrigatória." }),
  expiryDate: z.date({ required_error: "A data de vencimento é obrigatória." }),
  status: z.enum(['Solicitado', 'Ativo', 'Vencido', 'Em Renovação']),
}).refine(data => data.expiryDate > data.issueDate, {
  message: "A data de vencimento deve ser posterior à data de emissão.",
  path: ["expiryDate"],
});


export function SealFormDialog({ isOpen, onOpenChange, onSave, seal, products, contacts }: SealFormDialogProps) {
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        status: 'Ativo',
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      if (seal) {
        form.reset({
          productId: seal.productId,
          contactId: seal.contactId,
          issueDate: new Date(seal.issueDate),
          expiryDate: new Date(seal.expiryDate),
          status: seal.status,
        });
      } else {
        form.reset({
            productId: undefined,
            contactId: undefined,
            issueDate: new Date(),
            expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            status: 'Ativo',
        });
      }
    }
  }, [seal, form, isOpen]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const sealData = {
        ...values,
        issueDate: values.issueDate.toISOString(),
        expiryDate: values.expiryDate.toISOString(),
    };
    onSave(sealData, seal?.id);
    onOpenChange(false);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{seal ? 'Editar Selo' : 'Adicionar Novo Selo'}</DialogTitle>
          <DialogDescription>Preencha os detalhes para emitir ou atualizar um selo de certificação.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="productId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Produto Certificado</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um produto" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {products.map(product => (
                                    <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="contactId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Cliente</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um cliente" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {contacts.filter(c => c.type === 'cliente').map(contact => (
                                    <SelectItem key={contact.id} value={contact.id}>{contact.personType === 'Pessoa Física' ? contact.fullName : contact.tradeName}</SelectItem>
                                ))}
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
                        name="issueDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Data de Emissão</FormLabel>
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
                        name="expiryDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Data de Vencimento</FormLabel>
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
                 <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o status do selo" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Solicitado">Solicitado</SelectItem>
                                <SelectItem value="Ativo">Ativo</SelectItem>
                                <SelectItem value="Vencido">Vencido</SelectItem>
                                <SelectItem value="Em Renovação">Em Renovação</SelectItem>
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

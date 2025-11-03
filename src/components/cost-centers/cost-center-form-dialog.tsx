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
import type { CostCenter, User } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type CostCenterFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (costCenter: Omit<CostCenter, 'id'>, id?: string) => void;
  costCenter?: CostCenter | null;
  users: User[];
};

const formSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  code: z.string().optional(),
  description: z.string().optional(),
  responsibleId: z.string().optional(),
});

export function CostCenterFormDialog({ isOpen, onOpenChange, onSave, costCenter, users }: CostCenterFormDialogProps) {
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      responsibleId: undefined,
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      if (costCenter) {
        form.reset({
          name: costCenter.name,
          code: costCenter.code || '',
          description: costCenter.description || '',
          responsibleId: costCenter.responsibleId || undefined,
        });
      } else {
        form.reset({
          name: '',
          code: '',
          description: '',
          responsibleId: undefined,
        });
      }
    }
  }, [costCenter, form, isOpen]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values, costCenter?.id);
    onOpenChange(false);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{costCenter ? 'Editar Centro de Custo' : 'Criar Novo Centro de Custo'}</DialogTitle>
           <DialogDescription>
            Preencha os detalhes do centro de custo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome do Centro de Custo</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Marketing" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Código (Opcional)</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: MKT-001" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="responsibleId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Responsável</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um responsável" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="unassigned">Nenhum</SelectItem>
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
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
                        <FormLabel>Descrição (Opcional)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Descreva o propósito do centro de custo..." {...field} />
                        </FormControl>
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

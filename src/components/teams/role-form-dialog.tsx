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
import type { Role } from "@/lib/types";
import { Switch } from "../ui/switch";

type RoleFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (role: Omit<Role, 'id'>, roleId?: string) => void;
  role?: Role | null;
};

const formSchema = z.object({
  name: z.string().min(1, "O nome do cargo é obrigatório."),
  description: z.string().optional(),
  isManager: z.boolean().default(false),
  isDev: z.boolean().default(false),
});

const defaultValues = {
  name: '',
  description: '',
  isManager: false,
  isDev: false,
};

export function RoleFormDialog({ isOpen, onOpenChange, onSave, role }: RoleFormDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (isOpen) {
      if (role) {
         form.reset({
          name: role.name, 
          description: role.description || '', 
          isManager: role.isManager || false,
          isDev: role.isDev || false,
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [role, isOpen, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values, role?.id);
    onOpenChange(false);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{role ? 'Editar Cargo' : 'Adicionar Novo Cargo'}</DialogTitle>
          <DialogDescription>
            Gerencie o nome, a descrição e as permissões do cargo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome do Cargo</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Desenvolvedor, Vendedor" {...field} />
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
                            <Textarea placeholder="Descreva as responsabilidades deste cargo..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="isManager"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Permissão de Gestor</FormLabel>
                                <FormMessage />
                                <p className="text-xs text-muted-foreground">
                                    Concede acesso de visualização a todos os dados do sistema.
                                </p>
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
                 <FormField
                    control={form.control}
                    name="isDev"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Permissão de Desenvolvedor</FormLabel>
                                <FormMessage />
                                <p className="text-xs text-muted-foreground">
                                    Concede acesso total de leitura e escrita em todo o sistema.
                                </p>
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

                <DialogFooter>
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

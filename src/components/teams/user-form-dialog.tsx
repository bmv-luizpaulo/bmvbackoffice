
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
  DialogDescription
} from '@/components/ui/dialog';
import {
  Form
} from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import type { User } from "@/lib/types";
import { UserFormFields } from "./user-form-fields";


type UserFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (user: Omit<User, 'id' | 'avatarUrl'>) => void;
  user?: User | null;
};

// Base schema for user data
export const userFormSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  email: z.string().email("O e-mail é inválido."),
  roleId: z.string().optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().url("URL do LinkedIn inválida.").optional().or(z.literal('')),
  personalDocument: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional(),
  teamIds: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});


const defaultValues = {
    name: '',
    email: '',
    roleId: undefined,
    phone: '',
    linkedinUrl: '',
    personalDocument: '',
    address: {
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
    },
    teamIds: [],
    status: 'active' as const,
};

export function UserFormDialog({ isOpen, onOpenChange, onSave, user }: UserFormDialogProps) {
  
  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (isOpen) {
      if (user) {
        form.reset({
          name: user.name || '',
          email: user.email || '',
          roleId: user.roleId || undefined,
          phone: user.phone || '',
          linkedinUrl: user.linkedinUrl || '',
          personalDocument: user.personalDocument || '',
          address: user.address ? {
            street: user.address?.street || '',
            number: user.address?.number || '',
            complement: user.address?.complement || '',
            neighborhood: user.address?.neighborhood || '',
            city: user.address?.city || '',
            state: user.address?.state || '',
            zipCode: user.address?.zipCode || '',
          } : defaultValues.address,
          teamIds: user.teamIds || [],
          status: user.status || 'active',
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [user, isOpen, form]);

  function onSubmit(values: z.infer<typeof userFormSchema>) {
    onSave(values);
    onOpenChange(false);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{user ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</DialogTitle>
          <DialogDescription>Preencha os detalhes do usuário.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
                <UserFormFields form={form} isEditing={!!user} />
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

    
// This is a new file: src/components/agenda/contact-form-dialog.tsx
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
import { Separator } from "../ui/separator";
import type { Contact } from "@/lib/types";

type ContactFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (contact: Omit<Contact, 'id' | 'type'>) => void;
  contact?: Contact | null;
  type: 'cliente' | 'fornecedor' | 'parceiro';
};

const formSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  email: z.string().email("O e-mail é inválido."),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional(),
});

export function ContactFormDialog({ isOpen, onOpenChange, onSave, contact, type }: ContactFormDialogProps) {
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      companyName: '',
      address: {
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
      },
    }
  });

  React.useEffect(() => {
    if (isOpen) {
        if (contact) {
            form.reset({ 
                name: contact.name, 
                email: contact.email, 
                phone: contact.phone || '',
                companyName: contact.companyName || '',
                address: contact.address || {},
            });
            } else {
            form.reset({ 
                name: '', 
                email: '', 
                phone: '',
                companyName: '',
                address: {},
            });
        }
    }
  }, [contact, form, isOpen]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values);
    onOpenChange(false);
  }

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{contact ? `Editar ${typeLabel}` : `Adicionar Novo ${typeLabel}`}</DialogTitle>
           <DialogDescription>
            Gerencie as informações do contato aqui.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
                <div className="space-y-2">
                    <h3 className="text-lg font-medium">Informações de Contato</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nome Completo</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: José" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="companyName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Empresa</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Empresa Exemplo LTDA" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Endereço de E-mail</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="Ex: jose@empresa.com" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Telefone</FormLabel>
                                <FormControl>
                                    <Input placeholder="(XX) XXXXX-XXXX" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Separator />

                <div className="space-y-2">
                    <h3 className="text-lg font-medium">Endereço</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <FormField
                            control={form.control}
                            name="address.zipCode"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>CEP</FormLabel>
                                <FormControl>
                                    <Input placeholder="XXXXX-XXX" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="address.street"
                            render={({ field }) => (
                                <FormItem className="col-span-2">
                                <FormLabel>Rua</FormLabel>
                                <FormControl>
                                    <Input placeholder="Rua das Flores" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="address.number"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Número</FormLabel>
                                <FormControl>
                                    <Input placeholder="123" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="address.complement"
                            render={({ field }) => (
                                <FormItem className="col-span-2">
                                <FormLabel>Complemento</FormLabel>
                                <FormControl>
                                    <Input placeholder="Apto 4B" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="address.neighborhood"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Bairro</FormLabel>
                                <FormControl>
                                    <Input placeholder="Centro" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address.city"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Cidade</FormLabel>
                                <FormControl>
                                    <Input placeholder="São Paulo" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="address.state"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Estado</FormLabel>
                                <FormControl>
                                    <Input placeholder="SP" {...field} />
                                </FormControl>
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

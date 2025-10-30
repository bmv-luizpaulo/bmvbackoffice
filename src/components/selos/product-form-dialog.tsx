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
import type { Product } from "@/lib/types";

type ProductFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (product: Omit<Product, 'id'>) => void;
  product?: Product | null;
};

const formSchema = z.object({
  name: z.string().min(1, "O nome do produto é obrigatório."),
  sku: z.string().optional(),
  description: z.string().optional(),
});

export function ProductFormDialog({ isOpen, onOpenChange, onSave, product }: ProductFormDialogProps) {
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      sku: '',
      description: '',
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      if (product) {
        form.reset({
          name: product.name || '',
          sku: product.sku || '',
          description: product.description || '',
        });
      } else {
        form.reset({
          name: '',
          sku: '',
          description: '',
        });
      }
    }
  }, [product, form, isOpen]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values);
    onOpenChange(false);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Produto' : 'Adicionar Novo Produto'}</DialogTitle>
           <DialogDescription>
            Gerencie as informações do produto aqui.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Nome do Produto</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Certificação ISO 9001" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>SKU (Opcional)</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: PROD-00123" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Descreva o produto..." {...field} />
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

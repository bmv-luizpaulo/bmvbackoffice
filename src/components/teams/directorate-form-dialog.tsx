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
import type { Directorate, User } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";

type DirectorateFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (directorate: Omit<Directorate, 'id'>, id?: string) => void;
  directorate?: Directorate | null;
};

const formSchema = z.object({
  name: z.string().min(1, "O nome da diretoria é obrigatório."),
  description: z.string().optional(),
  directorId: z.string().optional(),
});

export function DirectorateFormDialog({ isOpen, onOpenChange, onSave, directorate }: DirectorateFormDialogProps) {
  const firestore = useFirestore();
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users } = useCollection<User>(usersQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      directorId: undefined,
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      if (directorate) {
        form.reset({
          name: directorate.name,
          description: directorate.description || '',
          directorId: directorate.directorId || undefined,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          directorId: undefined,
        });
      }
    }
  }, [directorate, form, isOpen]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const dataToSave: Partial<Omit<Directorate, 'id'>> = {
      ...values,
    };

    if (dataToSave.directorId === 'unassigned' || !dataToSave.directorId) {
      delete dataToSave.directorId;
    }
    
    onSave(dataToSave as Omit<Directorate, 'id'>, directorate?.id);
    onOpenChange(false);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{directorate ? 'Editar Diretoria' : 'Criar Nova Diretoria'}</DialogTitle>
           <DialogDescription>
            Preencha os detalhes da diretoria.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome da Diretoria</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Diretoria Operacional" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="directorId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Diretor Responsável</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um diretor" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="unassigned">Nenhum</SelectItem>
                                {users?.map(user => (
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
                            <Textarea placeholder="Descreva o propósito da diretoria..." {...field} />
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

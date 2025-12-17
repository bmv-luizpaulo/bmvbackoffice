'use client';

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";

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
import { Loader2 } from "lucide-react";
import { getCepInfoAction } from "@/lib/actions";
import { formatCPF, formatPhone } from "@/lib/masks";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import { ptBR } from 'date-fns/locale';

type ContactFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (contact: Omit<Contact, 'id'>) => void;
  contact?: Contact | null;
  type: 'cliente' | 'fornecedor' | 'parceiro';
};

const formSchema = z.object({
  firstName: z.string().min(1, "O nome é obrigatório."),
  lastName: z.string().optional(),
  email: z.string().email("O e-mail é inválido."),
  celular: z.string().optional(),
  telefone: z.string().optional(),
  createdAt: z.date().optional(),
  situacao: z.enum(['Ativo', 'Inativo', 'Bloqueado']),
  tipo: z.enum(['cliente', 'fornecedor', 'parceiro']),
  documento: z.string().min(1, "O documento é obrigatório."),
  tipoDocumento: z.enum(['CPF', 'CNPJ']),
  autenticacao: z.enum(['Verificado', 'Não verificado', 'Pendente']),
  address: z.object({
    cep: z.string().min(1, "CEP é obrigatório."),
    rua: z.string().min(1, "Rua é obrigatória."),
    cidade: z.string().min(1, "Cidade é obrigatória."),
    numero: z.string().min(1, "Número é obrigatório."),
    complemento: z.string().optional(),
    bairro: z.string().min(1, "Bairro é obrigatório."),
    pais: z.string().min(1, "País é obrigatório."),
  }),
});

const defaultValues: Partial<z.infer<typeof formSchema>> = {
  firstName: '',
  lastName: '',
  email: '',
  celular: '',
  telefone: '',
  createdAt: new Date(),
  situacao: 'Ativo',
  tipo: 'cliente',
  documento: '',
  tipoDocumento: 'CPF',
  autenticacao: 'Pendente',
  address: {
    cep: '',
    rua: '',
    cidade: '',
    numero: '',
    complemento: '',
    bairro: '',
    pais: 'Brasil',
  },
};

const getCreatedAtDate = (createdAt: any): Date | null => {
  if (!createdAt) return null;
  // Handle ISO string or number
  if (typeof createdAt === 'string' || typeof createdAt === 'number') {
    const date = new Date(createdAt);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  // Handle Firebase Timestamp
  if (createdAt.toDate) return createdAt.toDate();
  return null;
};


export function ContactFormDialog({ isOpen, onOpenChange, onSave, contact, type }: ContactFormDialogProps) {
  const [isCepLoading, setIsCepLoading] = React.useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...defaultValues, tipo: type }
  });
  
  const tipoDocumento = form.watch('tipoDocumento');

  React.useEffect(() => {
    if (isOpen) {
      if (contact) {
        form.reset({
          ...contact,
          createdAt: getCreatedAtDate(contact.createdAt) || new Date(),
          address: {
            ...defaultValues.address,
            ...contact.address
          }
        });
      } else {
        form.reset({ ...defaultValues, tipo: type });
      }
    }
  }, [contact, form, isOpen, type]);

  const handleCepLookup = async (cep: string) => {
    const cepDigits = cep.replace(/\D/g, '');
    if (cepDigits.length !== 8) {
      return;
    }

    setIsCepLoading(true);
    const result = await getCepInfoAction(cep);
    if (result.success && result.data) {
      const { logradouro, bairro, localidade, uf } = result.data;
      if (logradouro) form.setValue('address.rua', logradouro, { shouldValidate: true });
      if (bairro) form.setValue('address.bairro', bairro, { shouldValidate: true });
      if (localidade) form.setValue('address.cidade', localidade, { shouldValidate: true });
      if (uf) form.setValue('address.pais', 'Brasil'); // Assuming viacep is for Brazil
      form.setFocus('address.numero');
    }
    setIsCepLoading(false);
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values as Omit<Contact, 'id'>);
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="Ex: José" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem><FormLabel>Sobrenome</FormLabel><FormControl><Input placeholder="Ex: da Silva" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                </div>

                <Separator/>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="jose@empresa.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="celular" render={({ field }) => (
                      <FormItem><FormLabel>Celular</FormLabel><FormControl><Input placeholder="(11) 99999-9999" {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))}/></FormControl><FormMessage /></FormItem>
                  )}/>
                   <FormField control={form.control} name="telefone" render={({ field }) => (
                      <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(11) 5555-5555" {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))}/></FormControl><FormMessage /></FormItem>
                  )}/>
                </div>

                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="tipoDocumento" render={({ field }) => (
                    <FormItem><FormLabel>Tipo de Documento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="CPF">CPF</SelectItem><SelectItem value="CNPJ">CNPJ</SelectItem></SelectContent>
                      </Select><FormMessage/>
                    </FormItem>
                  )}/>
                   <FormField control={form.control} name="documento" render={({ field }) => (
                      <FormItem><FormLabel>{tipoDocumento}</FormLabel><FormControl><Input placeholder={`Número do ${tipoDocumento}`} {...field} onChange={(e) => field.onChange(tipoDocumento === 'CPF' ? formatCPF(e.target.value) : e.target.value)} /></FormControl><FormMessage /></FormItem>
                  )}/>
                </div>

                <Separator />

                <div className="space-y-2">
                    <h3 className="text-lg font-medium">Endereço</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <FormField control={form.control} name="address.cep" render={({ field }) => (
                            <FormItem><FormLabel>CEP</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input placeholder="XXXXX-XXX" {...field} onBlur={(e) => { field.onBlur(); handleCepLookup(e.target.value); }}/>
                                  {isCepLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin"/>}
                                </div>
                              </FormControl><FormMessage />
                            </FormItem>
                          )}/>
                         <FormField control={form.control} name="address.rua" render={({ field }) => (
                            <FormItem className="col-span-2"><FormLabel>Rua</FormLabel><FormControl><Input placeholder="Rua das Flores" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                         <FormField control={form.control} name="address.numero" render={({ field }) => (
                            <FormItem><FormLabel>Número</FormLabel><FormControl><Input placeholder="123" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                         <FormField control={form.control} name="address.complemento" render={({ field }) => (
                            <FormItem className="col-span-2"><FormLabel>Complemento</FormLabel><FormControl><Input placeholder="Apto 4B" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                         <FormField control={form.control} name="address.bairro" render={({ field }) => (
                            <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input placeholder="Centro" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                        <FormField control={form.control} name="address.cidade" render={({ field }) => (
                            <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input placeholder="São Paulo" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                         <FormField control={form.control} name="address.pais" render={({ field }) => (
                            <FormItem><FormLabel>País</FormLabel><FormControl><Input placeholder="Brasil" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                    </div>
                </div>

                 <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="situacao" render={({ field }) => (
                    <FormItem><FormLabel>Situação</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem><SelectItem value="Bloqueado">Bloqueado</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )}/>
                   <FormField control={form.control} name="autenticacao" render={({ field }) => (
                    <FormItem><FormLabel>Autenticação</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Verificado">Verificado</SelectItem><SelectItem value="Não verificado">Não verificado</SelectItem><SelectItem value="Pendente">Pendente</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )}/>
                   <FormField control={form.control} name="tipo" render={({ field }) => (
                    <FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="cliente">Cliente</SelectItem><SelectItem value="fornecedor">Fornecedor</SelectItem><SelectItem value="parceiro">Parceiro</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )}/>
                   <FormField control={form.control} name="createdAt" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Data de Criação</FormLabel>
                          <Popover><PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                              {field.value ? (format(field.value, "PPP", { locale: ptBR })) : (<span>Escolha uma data</span>)}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                          </Popover><FormMessage />
                        </FormItem>
                    )}/>
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

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
import { Loader2 } from "lucide-react";
import { getCepInfoAction } from "@/lib/actions";
import { formatCPF, formatPhone } from "@/lib/masks";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

type ContactFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (contact: Omit<Contact, 'id' | 'type'>) => void;
  contact?: Contact | null;
  type: 'cliente' | 'fornecedor' | 'parceiro';
};

const formSchema = z.object({
  personType: z.enum(['Pessoa Física', 'Pessoa Jurídica'], { required_error: 'O tipo de pessoa é obrigatório.' }),
  fullName: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  legalName: z.string().optional(),
  tradeName: z.string().optional(),
  cnpj: z.string().optional(),
  stateRegistration: z.string().optional(),
  email: z.string().email("O e-mail é inválido."),
  phone: z.string().optional(),
  linkedinUrl: z.string().url("URL do LinkedIn inválida.").optional().or(z.literal('')),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional(),
}).refine(data => {
    if (data.personType === 'Pessoa Física') return !!data.fullName;
    return true;
}, {
    message: "O nome completo é obrigatório.",
    path: ['fullName'],
}).refine(data => {
    if (data.personType === 'Pessoa Jurídica') return !!data.tradeName || !!data.legalName;
    return true;
}, {
    message: "O Nome Fantasia ou a Razão Social é obrigatório.",
    path: ['tradeName'],
});

const defaultValues: Partial<z.infer<typeof formSchema>> = {
  personType: 'Pessoa Física',
  fullName: '',
  cpf: '',
  rg: '',
  legalName: '',
  tradeName: '',
  cnpj: '',
  stateRegistration: '',
  email: '',
  phone: '',
  linkedinUrl: '',
  address: {
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  },
};

export function ContactFormDialog({ isOpen, onOpenChange, onSave, contact, type }: ContactFormDialogProps) {
  const [isCepLoading, setIsCepLoading] = React.useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues
  });
  
  const personType = form.watch('personType');

  React.useEffect(() => {
    if (isOpen) {
      if (contact) {
        form.reset({
          personType: contact.personType,
          fullName: contact.fullName || '',
          cpf: contact.cpf || '',
          rg: contact.rg || '',
          legalName: contact.legalName || '',
          tradeName: contact.tradeName || '',
          cnpj: contact.cnpj || '',
          stateRegistration: contact.stateRegistration || '',
          email: contact.email || '',
          phone: contact.phone || '',
          linkedinUrl: contact.linkedinUrl || '',
          address: {
            street: contact.address?.street || '',
            number: contact.address?.number || '',
            complement: contact.address?.complement || '',
            neighborhood: contact.address?.neighborhood || '',
            city: contact.address?.city || '',
            state: contact.address?.state || '',
            zipCode: contact.address?.zipCode || '',
          },
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [contact, form, isOpen]);

  const handleCepLookup = async (cep: string) => {
    const cepDigits = cep.replace(/\D/g, '');
    if (cepDigits.length !== 8) {
      return;
    }

    setIsCepLoading(true);
    const result = await getCepInfoAction(cep);
    if (result.success && result.data) {
      const { logradouro, bairro, localidade, uf } = result.data;
      if (logradouro) form.setValue('address.street', logradouro, { shouldValidate: true });
      if (bairro) form.setValue('address.neighborhood', bairro, { shouldValidate: true });
      if (localidade) form.setValue('address.city', localidade, { shouldValidate: true });
      if (uf) form.setValue('address.state', uf, { shouldValidate: true });
      form.setFocus('address.number');
    } else {
      // Optional: show a toast message with result.error
    }
    setIsCepLoading(false);
  };

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
                
                <FormField
                  control={form.control}
                  name="personType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Tipo de Pessoa</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Pessoa Física" />
                            </FormControl>
                            <FormLabel className="font-normal">Pessoa Física</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Pessoa Jurídica" />
                            </FormControl>
                            <FormLabel className="font-normal">Pessoa Jurídica</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator/>

                {personType === 'Pessoa Física' && (
                    <div className="space-y-4 animate-in fade-in-0 duration-300">
                      <h3 className="text-lg font-medium">Informações Pessoais (PF)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="fullName" render={({ field }) => (
                           <FormItem className="col-span-2"><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Ex: José da Silva" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="cpf" render={({ field }) => (
                           <FormItem><FormLabel>CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="rg" render={({ field }) => (
                           <FormItem><FormLabel>RG</FormLabel><FormControl><Input placeholder="00.000.000-0" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                      </div>
                    </div>
                )}
                
                {personType === 'Pessoa Jurídica' && (
                     <div className="space-y-4 animate-in fade-in-0 duration-300">
                      <h3 className="text-lg font-medium">Informações da Empresa (PJ)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="legalName" render={({ field }) => (
                           <FormItem><FormLabel>Razão Social</FormLabel><FormControl><Input placeholder="Ex: José da Silva LTDA" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="tradeName" render={({ field }) => (
                           <FormItem><FormLabel>Nome Fantasia</FormLabel><FormControl><Input placeholder="Ex: Silva Soluções" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="cnpj" render={({ field }) => (
                           <FormItem><FormLabel>CNPJ</FormLabel><FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="stateRegistration" render={({ field }) => (
                           <FormItem><FormLabel>Inscrição Estadual</FormLabel><FormControl><Input placeholder="Número da Inscrição Estadual" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                      </div>
                    </div>
                )}

                <Separator />
                
                <div className="space-y-2">
                    <h3 className="text-lg font-medium">Informações de Contato</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                     <Input 
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(formatPhone(e.target.value))
                                      }}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="linkedinUrl"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                <FormLabel>URL do LinkedIn</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://www.linkedin.com/in/seu-perfil" {...field} />
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
                                  <div className="relative">
                                    <Input 
                                      placeholder="XXXXX-XXX" 
                                      {...field} 
                                      onBlur={(e) => {
                                        field.onBlur();
                                        handleCepLookup(e.target.value);
                                      }}
                                    />
                                    {isCepLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin"/>}
                                  </div>
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

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
  DialogClose
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { User, Team } from "@/lib/types";
import { Separator } from "../ui/separator";
import { useCollection, useFirestore } from "@/firebase";
import { collection } from "firebase/firestore";
import { MultiSelect } from "../ui/multi-select";
import { Loader2, Users } from "lucide-react";
import { getCepInfoAction } from "@/lib/actions";
import { formatCPF, formatPhone } from "@/lib/masks";


type UserFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (user: Omit<User, 'id' | 'avatarUrl'>, password?: string) => void;
  user?: User | null;
};

// Base schema for user data
const baseFormSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  email: z.string().email("O e-mail é inválido."),
  password: z.string().optional(),
  role: z.enum(['Gestor', 'Usuario']),
  phone: z.string().optional(),
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
});


const defaultValues = {
    name: '',
    email: '',
    password: '',
    role: 'Usuario' as 'Gestor' | 'Usuario',
    phone: '',
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
};

export function UserFormDialog({ isOpen, onOpenChange, onSave, user }: UserFormDialogProps) {
  const firestore = useFirestore();
  const teamsQuery = React.useMemo(() => firestore ? collection(firestore, 'teams') : null, [firestore]);
  const { data: teamsData } = useCollection<Team>(teamsQuery);
  const [isCepLoading, setIsCepLoading] = React.useState(false);

  // Dynamically create schema based on whether we are creating or editing
  const formSchema = user
    ? baseFormSchema // Password optional for edits
    : baseFormSchema.refine(data => !!data.password && data.password.length >= 6, {
        message: "A senha é obrigatória e deve ter pelo menos 6 caracteres.",
        path: ["password"],
      });


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (isOpen) {
      if (user) {
        form.reset({
          name: user.name || '',
          email: user.email || '',
          role: user.role || 'Usuario',
          phone: user.phone || '',
          personalDocument: user.personalDocument || '',
          address: {
            street: user.address?.street || '',
            number: user.address?.number || '',
            complement: user.address?.complement || '',
            neighborhood: user.address?.neighborhood || '',
            city: user.address?.city || '',
            state: user.address?.state || '',
            zipCode: user.address?.zipCode || '',
          },
          teamIds: user.teamIds || [],
          password: '', // Senha não é preenchida na edição
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [user, isOpen, form]);

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
    const { password, ...userData } = values;
    onSave(userData, user ? undefined : password); // Só passa a senha na criação
    onOpenChange(false);
  }

  const teamOptions = teamsData?.map(team => ({ value: team.id, label: team.name })) || [];
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{user ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
                <div className="space-y-2">
                    <h3 className="text-lg font-medium">Informações Pessoais e de Acesso</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nome Completo</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: João da Silva" {...field} />
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
                                    <Input type="email" placeholder="Ex: joao.silva@empresa.com" {...field} disabled={!!user} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        {!user && (
                             <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Senha</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Telefone (WhatsApp)</FormLabel>
                                <FormControl>
                                     <Input 
                                      {...field}
                                      value={field.value || ''}
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
                            name="personalDocument"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Documento (CPF)</FormLabel>
                                <FormControl>
                                     <Input 
                                      {...field}
                                      value={field.value || ''}
                                      onChange={(e) => {
                                        field.onChange(formatCPF(e.target.value))
                                      }}
                                    />
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
                                      value={field.value || ''}
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
                                    <Input placeholder="Rua das Flores" {...field} value={field.value || ''} />
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
                                    <Input placeholder="123" {...field} value={field.value || ''} />
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
                                    <Input placeholder="Apto 4B" {...field} value={field.value || ''} />
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
                                    <Input placeholder="Centro" {...field} value={field.value || ''} />
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
                                    <Input placeholder="São Paulo" {...field} value={field.value || ''} />
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
                                    <Input placeholder="SP" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Separator />
                
                <div className="space-y-2">
                    <h3 className="text-lg font-medium">Informações do Sistema</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Função</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma função" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Gestor">Gestor</SelectItem>
                                        <SelectItem value="Usuario">Usuário</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="teamIds"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="flex items-center gap-2"><Users className="h-4 w-4" />Equipes</FormLabel>
                                    <MultiSelect
                                        options={teamOptions}
                                        selected={field.value || []}
                                        onChange={field.onChange}
                                        placeholder="Selecione as equipes..."
                                    />
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

    
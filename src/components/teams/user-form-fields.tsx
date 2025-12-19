
'use client';

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { userFormSchema } from "./user-form-dialog";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Team, Role } from "@/lib/types";
import { Separator } from "../ui/separator";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { MultiSelect } from "../ui/multi-select";
import { Loader2, Users } from "lucide-react";
import { getCepInfoAction } from "@/lib/actions";
import { formatCPF, formatPhone } from "@/lib/masks";
import { useToast } from "@/hooks/use-toast";

type UserFormFieldsProps = {
  form: ReturnType<typeof useForm<z.infer<typeof userFormSchema>>>;
  isEditing: boolean;
};

export function UserFormFields({ form, isEditing }: UserFormFieldsProps) {
  const firestore = useFirestore();
  const teamsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'teams') : null, [firestore]);
  const { data: teamsData } = useCollection<Team>(teamsQuery);
  const rolesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore]);
  const { data: rolesData } = useCollection<Role>(rolesQuery);
  const [isCepLoading, setIsCepLoading] = React.useState(false);
  const { toast } = useToast();

  const handleCepLookup = async (cep: string) => {
    const cepDigits = cep.replace(/\D/g, '');
    if (cepDigits.length !== 8) {
      return;
    }

    setIsCepLoading(true);
    const result = await getCepInfoAction(cepDigits);
    if (result.success && result.data) {
      const { logradouro, bairro, localidade, uf } = result.data;
      if (logradouro) form.setValue('address.street', logradouro, { shouldValidate: true });
      if (bairro) form.setValue('address.neighborhood', bairro, { shouldValidate: true });
      if (localidade) form.setValue('address.city', localidade, { shouldValidate: true });
      if (uf) form.setValue('address.state', uf, { shouldValidate: true });
      form.setFocus('address.number');
    } else {
        toast({ variant: 'destructive', title: "Erro ao buscar CEP", description: result.error });
    }
    setIsCepLoading(false);
  };

  const teamOptions = teamsData?.map(team => ({ value: team.id, label: team.name })) || [];
  const roleOptions = rolesData?.map(role => ({ value: role.id, label: role.name })) || [];

  return (
    <>
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
                  <Input type="email" placeholder="Ex: joao.silva@empresa.com" {...field} disabled={isEditing} />
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
                <FormLabel>Telefone (WhatsApp)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => {
                      field.onChange(formatPhone(e.target.value));
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
                      field.onChange(formatCPF(e.target.value));
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
                  <Input placeholder="https://www.linkedin.com/in/seu-perfil" {...field} value={field.value || ''} />
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
                    {isCepLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
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
            name="roleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cargo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
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
                <FormLabel className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Equipes
                </FormLabel>
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
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </>
  );
}

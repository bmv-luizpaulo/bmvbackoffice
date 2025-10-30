'use client';

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { User } from "firebase/auth";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { User as UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { getCepInfoAction } from "@/lib/actions";
import { Skeleton } from "../ui/skeleton";
import { formatCPF, formatPhone } from "@/lib/masks";

const profileFormSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  email: z.string().email(),
  role: z.string().optional(),
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
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileSettingsProps {
  user: User;
}

export function ProfileSettings({ user }: ProfileSettingsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCepLoading, setIsCepLoading] = React.useState(false);

  const userProfileRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'users', user.uid) : null,
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      email: '',
      role: '',
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
    },
  });

  React.useEffect(() => {
    if (userProfile) {
      form.reset({
        name: userProfile.name || '',
        email: userProfile.email || '',
        role: userProfile.role || 'Não definido',
        phone: userProfile.phone || '',
        personalDocument: userProfile.personalDocument || '',
        address: {
            street: userProfile.address?.street || '',
            number: userProfile.address?.number || '',
            complement: userProfile.address?.complement || '',
            neighborhood: userProfile.address?.neighborhood || '',
            city: userProfile.address?.city || '',
            state: userProfile.address?.state || '',
            zipCode: userProfile.address?.zipCode || '',
        },
      });
    }
  }, [userProfile, form]);

  const handleCepLookup = async (cep: string) => {
    const cepDigits = cep.replace(/\D/g, '');
    if (cepDigits.length !== 8) {
      return;
    }

    setIsCepLoading(true);
    const result = await getCepInfoAction(cep);
    if (result.success && result.data) {
      const { logradouro, bairro, localidade, uf } = result.data;
      form.setValue('address.street', logradouro || '');
      form.setValue('address.neighborhood', bairro || '');
      form.setValue('address.city', localidade || '');
      form.setValue('address.state', uf || '');
      form.setFocus('address.number');
    } else {
      toast({ variant: "destructive", title: "Erro", description: result.error || "CEP não encontrado." });
    }
    setIsCepLoading(false);
  };

  async function onSubmit(data: ProfileFormValues) {
    if (!userProfileRef) return;
    try {
      // Don't update email and role from this form
      const { email, role, ...updatableData } = data;
      await updateDoc(userProfileRef, {
        ...updatableData
      });
      toast({
        title: "Perfil Atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
      });
    }
  }

  const { isSubmitting } = form.formState;

  if (isLoadingProfile) {
    return <Card>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
          <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
        </CardContent>
        <CardFooter>
           <Skeleton className="h-10 w-24" />
        </CardFooter>
      </Card>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>
              Atualize suas informações pessoais e de contato.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível de Acesso</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
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
                name="personalDocument"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documento (CPF)</FormLabel>
                    <FormControl>
                       <Input 
                        {...field}
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
            <div className="space-y-2">
                <h3 className="text-base font-medium">Endereço</h3>
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
                            <FormItem className="md:col-span-2">
                            <FormLabel>Rua</FormLabel>
                            <FormControl>
                                <Input {...field} />
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
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="address.complement"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                            <FormLabel>Complemento</FormLabel>
                            <FormControl>
                                <Input {...field} />
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
                                <Input {...field} />
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
                                <Input {...field} />
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
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

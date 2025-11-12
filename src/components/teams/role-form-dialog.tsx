'use client';

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { PlusCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

type RoleFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (role: Omit<Role, 'id'>, roleId?: string) => void;
  role?: Role | null;
  allRoles: Role[];
};

const hierarchyOrder: Record<string, number> = {
  "CEO": 6,
  "Diretoria": 5,
  "Gerência": 4,
  "Coordenação": 3,
  "Analista": 2,
  "Assistente": 1,
  "Estagiário": 0,
};

const formSchema = z.object({
  name: z.string().min(1, "O nome do cargo é obrigatório."),
  department: z.enum(['Operações', 'TI', 'Financeiro', 'Comercial', 'RH', 'Administrativo'], { required_error: "O departamento é obrigatório."}),
  hierarchyLevel: z.enum(Object.keys(hierarchyOrder) as [keyof typeof hierarchyOrder], { required_error: "O nível hierárquico é obrigatório."}),
  supervisorRoleId: z.string().optional(),
  description: z.string().optional(),
  mission: z.string().optional(),
  responsibilities: z.array(z.object({ value: z.string() })).optional(),
  kpis: z.array(z.object({ value: z.string() })).optional(),
  requiredSkills: z.array(z.object({ value: z.string() })).optional(),
  salaryRange: z.object({
    min: z.coerce.number().optional(),
    max: z.coerce.number().optional(),
  }).optional(),
  permissions: z.object({
    isDev: z.boolean().default(false),
    isManager: z.boolean().default(false),
    canViewAllProjects: z.boolean().default(false),
    canManageProjects: z.boolean().default(false),
    canManageUsers: z.boolean().default(false),
    canManageContacts: z.boolean().default(false),
    canManageProductsAndSeals: z.boolean().default(false),
    canAccessFinancial: z.boolean().default(false),
    canManageChecklists: z.boolean().default(false),
    canManageAssets: z.boolean().default(false),
    canManageSupport: z.boolean().default(false),
  }).default({}),
}).refine(data => {
  if (data.hierarchyLevel === 'CEO') {
    return true;
  }
  return !!data.supervisorRoleId && data.supervisorRoleId !== 'unassigned';
}, {
  message: "O superior imediato é obrigatório para este nível hierárquico.",
  path: ["supervisorRoleId"],
});

const defaultValues: z.input<typeof formSchema> = {
  name: '',
  description: '',
  mission: '',
  responsibilities: [],
  kpis: [],
  requiredSkills: [],
  salaryRange: { min: undefined, max: undefined },
  permissions: {
    isDev: false,
    isManager: false,
    canViewAllProjects: false,
    canManageProjects: false,
    canManageUsers: false,
    canManageContacts: false,
    canManageProductsAndSeals: false,
    canAccessFinancial: false,
    canManageChecklists: false,
    canManageAssets: false,
    canManageSupport: false,
  },
};

export function RoleFormDialog({ isOpen, onOpenChange, onSave, role, allRoles }: RoleFormDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const { fields: respFields, append: appendResp, remove: removeResp } = useFieldArray({ control: form.control, name: "responsibilities" });
  const { fields: kpiFields, append: appendKpi, remove: removeKpi } = useFieldArray({ control: form.control, name: "kpis" });
  const { fields: skillFields, append: appendSkill, remove: removeSkill } = useFieldArray({ control: form.control, name: "requiredSkills" });


  React.useEffect(() => {
    if (isOpen) {
      if (role) {
         form.reset({
          name: role.name, 
          description: role.description || '', 
          department: role.department,
          hierarchyLevel: role.hierarchyLevel,
          supervisorRoleId: role.supervisorRoleId || undefined,
          mission: role.mission || '',
          responsibilities: role.responsibilities?.map(value => ({ value })) || [],
          kpis: role.kpis?.map(value => ({ value })) || [],
          requiredSkills: role.requiredSkills?.map(value => ({ value })) || [],
          salaryRange: {
            min: role.salaryRange?.min || undefined,
            max: role.salaryRange?.max || undefined,
          },
          permissions: {
            isDev: role.permissions?.isDev || false,
            isManager: role.permissions?.isManager || false,
            canViewAllProjects: role.permissions?.canViewAllProjects || false,
            canManageProjects: role.permissions?.canManageProjects || false,
            canManageUsers: role.permissions?.canManageUsers || false,
            canManageContacts: role.permissions?.canManageContacts || false,
            canManageProductsAndSeals: role.permissions?.canManageProductsAndSeals || false,
            canAccessFinancial: role.permissions?.canAccessFinancial || false,
            canManageChecklists: role.permissions?.canManageChecklists || false,
            canManageAssets: role.permissions?.canManageAssets || false,
            canManageSupport: role.permissions?.canManageSupport || false,
          },
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [role, isOpen, form]);

  const selectedHierarchyLevel = form.watch('hierarchyLevel');

  const supervisorOptions = React.useMemo(() => {
    if (!selectedHierarchyLevel || !allRoles) {
      return [];
    }
    const currentLevelOrder = hierarchyOrder[selectedHierarchyLevel];
    return allRoles.filter(r => {
      if (r.id === role?.id) return false; // a role cannot be its own supervisor
      const supervisorLevel = r.hierarchyLevel ? hierarchyOrder[r.hierarchyLevel] : -1;
      return supervisorLevel >= currentLevelOrder;
    });
  }, [selectedHierarchyLevel, allRoles, role]);

  React.useEffect(() => {
    const currentSupervisorId = form.getValues('supervisorRoleId');
    if (currentSupervisorId && currentSupervisorId !== 'unassigned') {
        const isSupervisorValid = supervisorOptions.some(opt => opt.id === currentSupervisorId);
        if (!isSupervisorValid) {
            form.setValue('supervisorRoleId', undefined, { shouldValidate: true });
        }
    }
     if (selectedHierarchyLevel === 'CEO') {
        form.setValue('supervisorRoleId', undefined, { shouldValidate: true });
    }
  }, [selectedHierarchyLevel, supervisorOptions, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const { salaryRange, ...restOfValues } = values;

    const finalData = {
        ...restOfValues,
        supervisorRoleId: values.supervisorRoleId === 'unassigned' ? undefined : values.supervisorRoleId,
        responsibilities: values.responsibilities?.map(item => item.value).filter(Boolean),
        kpis: values.kpis?.map(item => item.value).filter(Boolean),
        requiredSkills: values.requiredSkills?.map(item => item.value).filter(Boolean),
        salaryRange: {
            min: salaryRange?.min || undefined,
            max: salaryRange?.max || undefined,
        },
    };
    
    if (finalData.salaryRange?.min === undefined) {
        delete finalData.salaryRange.min;
    }
    if (finalData.salaryRange?.max === undefined) {
        delete finalData.salaryRange.max;
    }
    if (Object.keys(finalData.salaryRange || {}).length === 0) {
        delete (finalData as Partial<typeof finalData>).salaryRange;
    }
    
    if (finalData.supervisorRoleId === undefined) {
      delete finalData.supervisorRoleId;
    }

    onSave(finalData as Omit<Role, 'id'>, role?.id);
    onOpenChange(false);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{role ? 'Editar Cargo' : 'Adicionar Novo Cargo'}</DialogTitle>
          <DialogDescription>
            Preencha todos os detalhes e especificações do cargo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <ScrollArea className="h-[70vh] pr-6">
                <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full space-y-4">
                  
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="font-semibold text-lg">1. Identificação do Cargo</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem><FormLabel>Nome do Cargo</FormLabel><FormControl><Input placeholder="Ex: Gestor de Operações" {...field} /></FormControl><FormMessage /></FormItem>
                      )}/>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="department" render={({ field }) => (
                          <FormItem><FormLabel>Departamento</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione um departamento" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Operações">Operações</SelectItem><SelectItem value="TI">TI</SelectItem><SelectItem value="Financeiro">Financeiro</SelectItem><SelectItem value="Comercial">Comercial</SelectItem><SelectItem value="RH">RH</SelectItem><SelectItem value="Administrativo">Administrativo</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="hierarchyLevel" render={({ field }) => (
                          <FormItem><FormLabel>Nível Hierárquico</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione um nível" /></SelectTrigger></FormControl><SelectContent><SelectItem value="CEO">CEO</SelectItem><SelectItem value="Diretoria">Diretoria</SelectItem><SelectItem value="Gerência">Gerência</SelectItem><SelectItem value="Coordenação">Coordenação</SelectItem><SelectItem value="Analista">Analista</SelectItem><SelectItem value="Assistente">Assistente</SelectItem><SelectItem value="Estagiário">Estagiário</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )}/>
                      </div>
                      <FormField control={form.control} name="supervisorRoleId" render={({ field }) => (
                        <FormItem><FormLabel>Superior Imediato</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={selectedHierarchyLevel === 'CEO'}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o cargo supervisor" /></SelectTrigger></FormControl><SelectContent><SelectItem value="unassigned">Nenhum</SelectItem>{supervisorOptions.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                      )}/>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger className="font-semibold text-lg">2. Descrição Geral</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Resumo do Cargo</FormLabel><FormControl><Textarea placeholder="Breve descrição da função e objetivo principal." {...field} /></FormControl><FormMessage /></FormItem>
                      )}/>
                      <FormField control={form.control} name="mission" render={({ field }) => (
                        <FormItem><FormLabel>Missão / Objetivo do Cargo</FormLabel><FormControl><Textarea placeholder="O 'porquê' da função existir — foco estratégico." {...field} /></FormControl><FormMessage /></FormItem>
                      )}/>
                    </AccordionContent>
                  </AccordionItem>
                  
                   <AccordionItem value="item-5">
                    <AccordionTrigger className="font-semibold text-lg">3. Permissões de Acesso</AccordionTrigger>
                    <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <FormField control={form.control} name="permissions.isDev" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm col-span-2"><div className="space-y-0.5"><FormLabel>Acesso de Desenvolvedor</FormLabel><p className="text-xs text-muted-foreground">Acesso total e irrestrito a todo o sistema.</p></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )}/>
                        <FormField control={form.control} name="permissions.isManager" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Gestor (Legado)</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )}/>
                        <FormField control={form.control} name="permissions.canViewAllProjects" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Ver Todos os Projetos</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )}/>
                         <FormField control={form.control} name="permissions.canManageProjects" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Gerenciar Projetos</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )}/>
                         <FormField control={form.control} name="permissions.canManageUsers" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Gerenciar Usuários</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )}/>
                         <FormField control={form.control} name="permissions.canManageContacts" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Gerenciar Contatos</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )}/>
                        <FormField control={form.control} name="permissions.canManageProductsAndSeals" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Gerenciar Produtos/Selos</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )}/>
                        <FormField control={form.control} name="permissions.canAccessFinancial" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Acessar Financeiro</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )}/>
                         <FormField control={form.control} name="permissions.canManageChecklists" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Gerenciar Checklists</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )}/>
                        <FormField control={form.control} name="permissions.canManageAssets" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Gerenciar Ativos</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )}/>
                         <FormField control={form.control} name="permissions.canManageSupport" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Gerenciar Suporte</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )}/>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger className="font-semibold text-lg">4. Responsabilidades e KPIs</AccordionTrigger>
                    <AccordionContent className="space-y-6 pt-4">
                      <div className="space-y-2">
                        <FormLabel>Principais Responsabilidades</FormLabel>
                        {respFields.map((field, index) => (
                          <div key={field.id} className="flex items-center gap-2">
                            <FormField control={form.control} name={`responsibilities.${index}.value`} render={({ field }) => (
                              <FormItem className="flex-1"><FormControl><Input {...field} placeholder={`Responsabilidade #${index + 1}`} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeResp(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendResp({ value: '' })}><PlusCircle className="mr-2 h-4 w-4"/>Adicionar Responsabilidade</Button>
                      </div>
                       <div className="space-y-2">
                        <FormLabel>Indicadores de Desempenho (KPIs)</FormLabel>
                        {kpiFields.map((field, index) => (
                          <div key={field.id} className="flex items-center gap-2">
                            <FormField control={form.control} name={`kpis.${index}.value`} render={({ field }) => (
                              <FormItem className="flex-1"><FormControl><Input {...field} placeholder={`KPI #${index + 1}`} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeKpi(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendKpi({ value: '' })}><PlusCircle className="mr-2 h-4 w-4"/>Adicionar KPI</Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                   <AccordionItem value="item-4">
                    <AccordionTrigger className="font-semibold text-lg">5. Competências e Salário</AccordionTrigger>
                    <AccordionContent className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <FormLabel>Competências Técnicas e Comportamentais</FormLabel>
                            {skillFields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2">
                                <FormField control={form.control} name={`requiredSkills.${index}.value`} render={({ field }) => (
                                <FormItem className="flex-1"><FormControl><Input {...field} placeholder={`Competência #${index + 1}`} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeSkill(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendSkill({ value: '' })}><PlusCircle className="mr-2 h-4 w-4"/>Adicionar Competência</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="salaryRange.min" render={({ field }) => (
                                <FormItem><FormLabel>Faixa Salarial (Mínimo)</FormLabel><FormControl><Input type="number" placeholder="Ex: 3000" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="salaryRange.max" render={({ field }) => (
                                <FormItem><FormLabel>Faixa Salarial (Máximo)</FormLabel><FormControl><Input type="number" placeholder="Ex: 5000" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>
              </ScrollArea>
              <DialogFooter className="pt-6">
                  <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                  <Button type="submit">Salvar Cargo</Button>
              </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

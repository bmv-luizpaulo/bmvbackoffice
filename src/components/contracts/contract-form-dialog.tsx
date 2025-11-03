'use client';

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

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
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Contract, Asset, Project } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "../ui/separator";

type ContractFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (contractData: Omit<Contract, 'id' | 'fileUrl' | 'uploaderId' | 'uploadedAt'>, file?: File, contractId?: string) => void;
  contract?: Contract | null;
  assets: Asset[];
  projects: Project[];
};

const formSchema = z.object({
  title: z.string().min(1, "O título é obrigatório."),
  description: z.string().optional(),
  contractType: z.enum(['Garantia', 'Serviço', 'Acordo de Nível de Serviço (SLA)', 'Aluguel', 'Outros']),
  vendor: z.string().optional(),
  assetId: z.string().optional(),
  projectId: z.string().optional(),
  startDate: z.date({ required_error: "A data de início é obrigatória." }),
  endDate: z.date({ required_error: "A data de fim é obrigatória." }),
  file: z.any().optional(),
}).refine(data => !data.endDate || !data.startDate || data.endDate >= data.startDate, {
  message: "A data de fim deve ser igual ou posterior à data de início.",
  path: ["endDate"],
});


export function ContractFormDialog({ isOpen, onOpenChange, onSave, contract, assets, projects }: ContractFormDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = React.useState<File | undefined>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      vendor: '',
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      if (contract) {
        form.reset({
          title: contract.title,
          description: contract.description,
          contractType: contract.contractType,
          vendor: contract.vendor,
          assetId: contract.assetId,
          projectId: contract.projectId,
          startDate: new Date(contract.startDate),
          endDate: new Date(contract.endDate),
        });
        setFile(undefined);
      } else {
        form.reset({
          title: '',
          description: '',
          contractType: undefined,
          vendor: '',
          assetId: undefined,
          projectId: undefined,
          startDate: undefined,
          endDate: undefined,
        });
        setFile(undefined);
      }
    }
  }, [contract, form, isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ title: "Arquivo muito grande", description: "O arquivo deve ter no máximo 10MB.", variant: "destructive" });
        return;
      }
      setFile(selectedFile);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const { file: formFile, ...contractData } = values;
    await onSave(
      {
        ...contractData,
        startDate: contractData.startDate.toISOString(),
        endDate: contractData.endDate.toISOString(),
      },
      file,
      contract?.id
    );
    setIsSubmitting(false);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{contract ? 'Editar Contrato' : 'Adicionar Novo Contrato'}</DialogTitle>
          <DialogDescription>Preencha os detalhes do contrato abaixo.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Título do Contrato</FormLabel>
                        <FormControl><Input placeholder="Ex: Contrato de Manutenção de Servidores" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl><Textarea placeholder="Descreva o objeto do contrato" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="contractType"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tipo de Contrato</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Garantia">Garantia</SelectItem>
                                    <SelectItem value="Serviço">Serviço</SelectItem>
                                    <SelectItem value="Acordo de Nível de Serviço (SLA)">Acordo de Nível de Serviço (SLA)</SelectItem>
                                    <SelectItem value="Aluguel">Aluguel</SelectItem>
                                    <SelectItem value="Outros">Outros</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="vendor"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Fornecedor / Terceiro</FormLabel>
                            <FormControl><Input placeholder="Ex: Dell Inc." {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Data de Início</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn(!field.value && "text-muted-foreground")}>
                                      {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Data de Fim</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn(!field.value && "text-muted-foreground")}>
                                      {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Separator />
                <h3 className="text-base font-medium">Vínculos (Opcional)</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="assetId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Vincular a Ativo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione um ativo" /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="unlinked">Nenhum</SelectItem>{assets.map(asset => (<SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>))}</SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="projectId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Vincular a Projeto</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione um projeto" /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="unlinked">Nenhum</SelectItem>{projects.map(project => (<SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>))}</SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Separator />
                 <FormField
                    control={form.control}
                    name="file"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Arquivo do Contrato</FormLabel>
                            <FormControl>
                                <div className="relative p-6 border-2 border-dashed rounded-lg text-center">
                                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                                    <p className="text-muted-foreground mt-2 mb-2 text-sm">{file ? `Arquivo selecionado: ${file.name}` : contract?.fileUrl ? 'Arquivo existente. Selecione um novo para substituir.' : "Arraste um arquivo ou clique para selecionar"}</p>
                                    <Input id="receipt-upload" type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept="application/pdf,image/*"/>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
                
                <DialogFooter className="pt-4">
                    <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        {contract ? 'Salvar Alterações' : 'Criar Contrato'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

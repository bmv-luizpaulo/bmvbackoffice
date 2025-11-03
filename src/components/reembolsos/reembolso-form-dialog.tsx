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
import type { CostCenter, Reimbursement } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type ReembolsoFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (reimbursement: Omit<Reimbursement, 'id' | 'requesterId'>, receiptFile?: File) => void;
  reimbursement?: Reimbursement | null;
};

const formSchema = z.object({
  description: z.string().min(1, "A descrição é obrigatória."),
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que zero."),
  requestDate: z.date({ required_error: "A data da despesa é obrigatória." }),
  costCenterId: z.string().optional(),
  notes: z.string().optional(),
  receipt: z.any().optional(),
});

export function ReembolsoFormDialog({ isOpen, onOpenChange, onSave, reimbursement }: ReembolsoFormDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [receiptFile, setReceiptFile] = React.useState<File | undefined>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const costCentersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'costCenters') : null, [firestore]);
  const { data: costCentersData } = useCollection<CostCenter>(costCentersQuery);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { description: '', amount: 0, notes: '' },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (reimbursement) {
        form.reset({
          description: reimbursement.description,
          amount: reimbursement.amount,
          requestDate: new Date(reimbursement.requestDate),
          costCenterId: reimbursement.costCenterId,
          notes: reimbursement.notes || '',
        });
        setReceiptFile(undefined);
      } else {
        form.reset({ description: '', amount: 0, requestDate: new Date(), notes: '', costCenterId: undefined });
        setReceiptFile(undefined);
      }
    }
  }, [reimbursement, form, isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Arquivo muito grande", description: "O comprovante deve ter no máximo 5MB.", variant: "destructive" });
        return;
      }
      setReceiptFile(file);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const dataToSave = {
      ...values,
      requestDate: values.requestDate.toISOString(),
      // Esses campos serão definidos no backend ou na função de salvamento principal
      status: 'Pendente' as const,
    };
    await onSave(dataToSave, receiptFile);
    setIsSubmitting(false);
    onOpenChange(false);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{reimbursement ? 'Editar Solicitação' : 'Nova Solicitação de Reembolso'}</DialogTitle>
          <DialogDescription>Preencha os detalhes da sua despesa para solicitar o reembolso.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Descrição da Despesa</FormLabel>
                        <FormControl><Input placeholder="Ex: Almoço com cliente" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Valor (R$)</FormLabel>
                            <FormControl><Input type="number" step="0.01" placeholder="50.00" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="requestDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Data da Despesa</FormLabel>
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
                 <FormField
                    control={form.control}
                    name="costCenterId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Centro de Custo (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Associe a um centro de custo" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {costCentersData?.map(cc => (
                                    <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Observações (Opcional)</FormLabel>
                        <FormControl><Textarea placeholder="Adicione qualquer contexto ou informação adicional aqui." {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="receipt"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Comprovante</FormLabel>
                            <FormControl>
                                <div className="relative p-6 border-2 border-dashed rounded-lg text-center">
                                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                                    <p className="text-muted-foreground mt-2 mb-2 text-sm">{receiptFile ? `Arquivo selecionado: ${receiptFile.name}` : "Arraste um arquivo ou clique para selecionar"}</p>
                                    <Input id="receipt-upload" type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/*,.pdf"/>
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
                        {reimbursement ? 'Salvar Alterações' : 'Enviar Solicitação'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

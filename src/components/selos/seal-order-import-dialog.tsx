'use client';

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from "../ui/textarea";
import type { SealOrder } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { parse, isValid } from "date-fns";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import { format } from 'date-fns/format';

type SealOrderImportDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (orders: Partial<SealOrder>[]) => Promise<void>;
};

export function SealOrderImportDialog({ isOpen, onOpenChange, onSave }: SealOrderImportDialogProps) {
  const { toast } = useToast();
  const [textData, setTextData] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [parsedOrders, setParsedOrders] = React.useState<Partial<SealOrder>[]>([]);
  const [parseError, setParseError] = React.useState<string | null>(null);

  const cleanValue = (value: string) => value.trim().replace(/^"|"$/g, '');

  const parseDate = (dateStr: string): Date | null => {
      const formats = ['dd/MM/yyyy HH:mm:ss', 'dd/MM/yyyy HH:mm', 'dd/MM/yy HH:mm'];
      for (const format of formats) {
          try {
            const parsedDate = parse(dateStr, format, new Date());
            if (isValid(parsedDate)) {
                return parsedDate;
            }
          } catch (e) {
            // Ignore parse errors from date-fns for invalid formats
          }
      }
      return null;
  };

  const parseNumber = (numStr: string): number => {
    if (!numStr) return 0;
    const cleaned = numStr.replace(/\./g, '').replace(',', '.').replace(/R\$\s?/, '').replace(/UCS/i, '').trim();
    return parseFloat(cleaned) || 0;
  };
  
  const extractOriginAndDocument = (text: string) => {
    const docRegex = /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2})/;
    const match = text.match(docRegex);
    if (match) {
        const doc = match[0];
        const name = text.replace(doc, '').trim();
        return { originName: name, originDocument: doc };
    }
    return { originName: text, originDocument: '' };
  }

  const handleParse = () => {
      setParseError(null);
      const lines = textData.trim().split('\n').filter(line => line.trim().length > 0);
      if (lines.length === 0) {
        setParsedOrders([]);
        return;
      }
      
      const orders: Partial<SealOrder>[] = [];
      // Ignorar a primeira linha se for o cabeçalho
      const dataLines = lines[0].toLowerCase().includes('pedido') ? lines.slice(1) : lines;

      for (const line of dataLines) {
        // Split by tab or multiple spaces
        const columns = line.split(/\t|\s{2,}/).map(cleanValue);
        
        if (columns.length < 9) {
            setParseError(`Formato de linha inválido. Esperava 9 colunas, mas encontrou ${columns.length}. Linha: "${line}"`);
            setParsedOrders([]);
            return;
        }

        const orderDate = parseDate(columns[1]);
        if (!orderDate) {
            setParseError(`Formato de data inválido na linha: "${line}" (esperado dd/mm/yyyy hh:mm:ss).`);
            setParsedOrders([]);
            return;
        }

        const { originName, originDocument } = extractOriginAndDocument(columns[2]);

        orders.push({
            legacyId: parseInt(columns[0].replace('#', '')) || 0,
            orderDate: orderDate,
            originName: originName,
            originDocument: originDocument,
            program: columns[3],
            uf: columns[4],
            dq: columns[5].toLowerCase() === 'sim',
            quantity: parseNumber(columns[6]),
            tax: parseNumber(columns[7]),
            total: parseNumber(columns[8]),
            status: 'Pendente de Aprovação', // Status padrão inicial
        });
      }
      setParsedOrders(orders);
      toast({ title: "Dados Analisados", description: `${orders.length} pedidos prontos para importação.` });
  }

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(parsedOrders);
    setIsSaving(false);
    onOpenChange(false);
  }

  React.useEffect(() => {
    if (!isOpen) {
        setTextData('');
        setParsedOrders([]);
        setParseError(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar Pedidos Legados</DialogTitle>
          <DialogDescription>
            Copie os dados da sua planilha (incluindo cabeçalhos) e cole no campo abaixo. As colunas devem ser separadas por tabulação (Tab).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
            <Textarea
                placeholder="Cole os dados da sua tabela aqui..."
                className="min-h-[200px] font-mono text-xs"
                value={textData}
                onChange={(e) => setTextData(e.target.value)}
            />
            <Button onClick={handleParse}>Analisar Dados</Button>

            {parseError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro na Análise</AlertTitle>
                    <AlertDescription>{parseError}</AlertDescription>
                </Alert>
            )}

            {parsedOrders.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-medium">Pré-visualização da Importação ({parsedOrders.length} pedidos)</h4>
                    <div className="max-h-[200px] overflow-y-auto rounded-md border">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-muted">
                                <tr>
                                    <th className="p-2">ID Legado</th>
                                    <th className="p-2">Data</th>
                                    <th className="p-2">Origem</th>
                                    <th className="p-2">Total</th>
                                    <th className="p-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedOrders.slice(0, 20).map((order, i) => (
                                    <tr key={i} className="border-t">
                                        <td className="p-2">{order.legacyId}</td>
                                        <td className="p-2">{format(order.orderDate as Date, 'dd/MM/yy HH:mm')}</td>
                                        <td className="p-2 truncate max-w-xs">{order.originName}</td>
                                        <td className="p-2">R$ {order.total?.toFixed(2)}</td>
                                        <td className="p-2">{order.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {parsedOrders.length > 20 && <p className="text-xs text-muted-foreground text-center">...e mais {parsedOrders.length - 20} pedidos.</p>}
                </div>
            )}
        </div>
        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving || parsedOrders.length === 0 || !!parseError}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar {parsedOrders.length > 0 ? parsedOrders.length : ''} Pedidos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

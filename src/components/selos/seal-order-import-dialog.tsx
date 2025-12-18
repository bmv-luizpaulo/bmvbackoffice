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
import { Input } from "../ui/input";
import type { SealOrder } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, PlusCircle, Trash2 } from "lucide-react";
import { parse, isValid } from "date-fns";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";

type SealOrderImportDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (orders: Partial<SealOrder>[]) => Promise<void>;
};

type RowData = {
  id: number;
  legacyId: string;
  orderDate: string;
  originName: string;
  program: string;
  uf: string;
  dq: string;
  quantity: string;
  tax: string;
  total: string;
  error?: string;
};

const COLUMNS = ['legacyId', 'orderDate', 'originName', 'program', 'uf', 'dq', 'quantity', 'tax', 'total'];

const initialRow = { id: 0, legacyId: '', orderDate: '', originName: '', program: '', uf: '', dq: '', quantity: '', tax: '', total: '' };

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const formats = ['dd/MM/yyyy HH:mm:ss', 'dd/MM/yyyy HH:mm', 'dd/MM/yy HH:mm', 'yyyy-MM-dd HH:mm:ss'];
  for (const format of formats) {
    try {
      const parsedDate = parse(dateStr, format, new Date());
      if (isValid(parsedDate)) return parsedDate;
    } catch (e) { /* ignore */ }
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
        const name = text.replace(doc, '').replace(doc.replace(/\D/g, ''), '').trim();
        return { originName: name, originDocument: doc };
    }
    return { originName: text.trim(), originDocument: '' };
};

const validateAndConvertToSealOrder = (row: RowData): Partial<SealOrder> | { error: string } => {
  if (Object.values(row).every(v => v === '' || typeof v === 'number')) return { error: 'Linha vazia.' };

  const date = parseDate(row.orderDate);
  if (!date) return { error: `Data inválida: ${row.orderDate}` };

  const { originName, originDocument } = extractOriginAndDocument(row.originName);

  return {
    legacyId: parseInt(row.legacyId.replace('#', '')) || 0,
    orderDate: date,
    originName: originName,
    originDocument: originDocument,
    program: row.program,
    uf: row.uf,
    dq: row.dq.toLowerCase() === 'sim',
    quantity: parseNumber(row.quantity),
    tax: parseNumber(row.tax),
    total: parseNumber(row.total),
    status: 'Pendente de Aprovação',
  };
};

export function SealOrderImportDialog({ isOpen, onOpenChange, onSave }: SealOrderImportDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [rows, setRows] = React.useState<RowData[]>([initialRow]);

  const handleAddRow = () => {
    setRows(prev => [...prev, { ...initialRow, id: Date.now() + prev.length }]);
  };

  const handleRemoveRow = (id: number) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };
  
  const handleInputChange = (id: number, field: keyof RowData, value: string) => {
    setRows(prev => prev.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const pastedRows = pasteData.split('\n').filter(r => r.trim() !== '');

    const newRows: RowData[] = pastedRows.map((line, lineIndex) => {
      const columns = line.split('\t');
      const rowData: any = { id: Date.now() + lineIndex };
      COLUMNS.forEach((colKey, colIndex) => {
        rowData[colKey] = columns[colIndex] || '';
      });
      return rowData as RowData;
    });

    setRows(newRows);
  };

  const validatedOrders = React.useMemo(() => {
    return rows.map(validateAndConvertToSealOrder);
  }, [rows]);

  const hasErrors = validatedOrders.some(o => 'error' in o);
  const validOrderCount = validatedOrders.filter(o => !('error' in o) && o.legacyId).length;

  const handleSave = async () => {
    setIsSaving(true);
    const ordersToSave = validatedOrders.filter(o => !('error' in o) && o.legacyId) as Partial<SealOrder>[];
    await onSave(ordersToSave);
    setIsSaving(false);
    onOpenChange(false);
  }

  React.useEffect(() => {
    if (!isOpen) {
        setRows([initialRow]);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Importar Pedidos Legados</DialogTitle>
          <DialogDescription>
            Copie os dados da sua planilha (Ctrl+C) e cole na primeira célula da tabela abaixo (Ctrl+V).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4" onPaste={handlePaste}>
            <ScrollArea className="h-[50vh] border rounded-md">
                <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted z-10">
                        <tr className="divide-x">
                            <th className="p-2 w-16">Ações</th>
                            <th className="p-2 w-24">Pedido</th>
                            <th className="p-2 w-48">Data</th>
                            <th className="p-2 w-96">Origem</th>
                            <th className="p-2">PARC/PROG</th>
                            <th className="p-2">UF</th>
                            <th className="p-2">D.O</th>
                            <th className="p-2">Quantidade</th>
                            <th className="p-2">Taxa</th>
                            <th className="p-2">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {rows.map((row, index) => (
                           <tr key={row.id} className="divide-x">
                            <td className="p-1 text-center">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveRow(row.id)}>
                                    <Trash2 className="h-3 w-3 text-destructive"/>
                                </Button>
                            </td>
                            {COLUMNS.map(colKey => (
                                <td key={colKey} className="p-0">
                                    <Input
                                        value={row[colKey as keyof RowData] as string}
                                        onChange={(e) => handleInputChange(row.id, colKey as keyof RowData, e.target.value)}
                                        className="h-full w-full border-0 rounded-none focus-visible:ring-1 focus-visible:ring-primary"
                                    />
                                </td>
                            ))}
                           </tr>
                        ))}
                    </tbody>
                </table>
            </ScrollArea>
             <div className="flex items-center justify-between">
                <Button onClick={handleAddRow} variant="outline" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4"/> Adicionar Linha
                </Button>
                {hasErrors && (
                    <Alert variant="destructive" className="max-w-md">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Erros Encontrados</AlertTitle>
                        <AlertDescription>
                            Algumas linhas contêm dados inválidos e não serão importadas. Verifique as datas e campos obrigatórios.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving || validOrderCount === 0}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Importar {validOrderCount > 0 ? `${validOrderCount} Pedido(s)` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

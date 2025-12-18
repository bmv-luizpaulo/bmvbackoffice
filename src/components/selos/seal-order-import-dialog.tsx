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
import { Loader2, AlertCircle, PlusCircle, Trash2, Upload, FileSpreadsheet } from "lucide-react";
import { parse, isValid, parseISO } from "date-fns";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";

type SealOrderImportDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (orders: Partial<SealOrder>[]) => Promise<void>;
};

type RowData = {
  legacyId: string;
  orderDate: string;
  originName: string;
  program: string;
  uf: string;
  dq: string;
  quantity: string;
  tax: string;
  total: string;
  status?: string;
};

const parseDate = (dateStr: string | number | object): Date | null => {
  if (!dateStr) return null;
  // Handle complex date object from Firestore
  if (typeof dateStr === 'object' && dateStr !== null && 'y' in dateStr && 'm' in dateStr && 'd' in dateStr) {
      const { y, m, d, H, M, S } = dateStr as { y: number, m: number, d: number, H?: number, M?: number, S?: number };
      // Firestore month is 1-12, JS month is 0-11
      const date = new Date(y, m - 1, d, H || 0, M || 0, S || 0);
      if (isValid(date)) return date;
  }
  
  // Handle Excel's date serial number
  if (typeof dateStr === 'number') {
    const excelDate = XLSX.SSF.parse_date_code(dateStr);
    if (excelDate) {
        // JS month is 0-indexed, excelDate.m is 1-indexed
        return new Date(excelDate.y, excelDate.m - 1, excelDate.d, excelDate.H, excelDate.M, excelDate.S);
    }
  }

  if (typeof dateStr === 'string') {
      // Handle ISO string
      const isoDate = parseISO(dateStr);
      if (isValid(isoDate)) return isoDate;

      // Handle custom string formats
      const formats = ['dd/MM/yyyy HH:mm:ss', 'dd/MM/yyyy HH:mm', 'dd/MM/yy HH:mm', 'yyyy-MM-dd HH:mm:ss', 'M/d/yy, HH:mm:ss'];
      for (const format of formats) {
        try {
          const parsedDate = parse(dateStr, format, new Date());
          if (isValid(parsedDate)) return parsedDate;
        } catch (e) { /* ignore */ }
      }
  }

  // Fallback for any other case
  const genericParse = new Date(dateStr as any);
  if (isValid(genericParse)) return genericParse;

  return null;
};


const parseNumber = (numStr: string | number): number => {
    if (typeof numStr === 'number') return numStr;
    if (!numStr) return 0;
    const cleaned = String(numStr).replace(/\./g, '').replace(',', '.').replace(/R\$\s?/, '').replace(/UCS/i, '').trim();
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

const validateAndConvertToSealOrder = (row: RowData, index: number): Partial<SealOrder> | { error: string } => {
  const { originName, originDocument } = extractOriginAndDocument(row.originName);

  const order: Partial<SealOrder> = {
    legacyId: parseInt(String(row.legacyId).replace('#', '')) || 0,
    orderDate: parseDate(row.orderDate),
    originName: originName,
    originDocument: originDocument,
    program: row.program,
    uf: row.uf,
    dq: String(row.dq).toLowerCase() === 'sim',
    quantity: parseNumber(row.quantity),
    tax: parseNumber(row.tax),
    total: parseNumber(row.total),
    status: row.status as any || 'Pendente de Aprovação'
  };

  if (!order.legacyId) return { error: `Linha ${index + 2}: 'Pedido' (ID Legado) é obrigatório e deve ser um número.` };
  if (!order.orderDate) return { error: `Linha ${index + 2}: 'Data' inválida: ${row.orderDate}` };
  if (!order.originName) return { error: `Linha ${index + 2}: 'Origem' é obrigatório.` };

  return order;
};

export function SealOrderImportDialog({ isOpen, onOpenChange, onSave }: SealOrderImportDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [parsedRows, setParsedRows] = React.useState<Partial<SealOrder>[]>([]);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsedRows([]);
    setErrors([]);
    setIsSaving(true);

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: RowData[] = XLSX.utils.sheet_to_json(worksheet, {
            header: ["legacyId", "orderDate", "originName", "program", "uf", "dq", "quantity", "tax", "total", "status"],
            range: 1 // Pula a linha do cabeçalho
        });

        const newParsedRows: Partial<SealOrder>[] = [];
        const newErrors: string[] = [];

        json.forEach((row, index) => {
            const result = validateAndConvertToSealOrder(row, index);
            if ('error' in result) {
                newErrors.push(result.error);
            } else {
                newParsedRows.push(result);
            }
        });

        setParsedRows(newParsedRows);
        setErrors(newErrors);

    } catch (error) {
        toast({ title: "Erro ao ler arquivo", description: "Não foi possível processar o arquivo. Verifique se o formato está correto.", variant: "destructive" });
    } finally {
        setIsSaving(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  const handleSave = async () => {
    setIsSaving(true);
    await onSave(parsedRows);
    setIsSaving(false);
    onOpenChange(false);
  }

  React.useEffect(() => {
    if (!isOpen) {
        setFileName(null);
        setParsedRows([]);
        setErrors([]);
    }
  }, [isOpen]);

  const hasErrors = errors.length > 0;
  const validOrderCount = parsedRows.length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar Pedidos Legados</DialogTitle>
          <DialogDescription>
            Envie um arquivo CSV ou XLSX com os pedidos legados para importação em massa.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Arquivo (CSV ou XLSX)</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                disabled={isSaving}
                ref={fileInputRef}
              />
              <p className="text-sm text-muted-foreground">
                O arquivo deve conter as colunas na ordem correta, sem cabeçalho na primeira linha.
              </p>
            </div>
            
            {(isSaving && parsedRows.length === 0) && (
              <div className="flex items-center justify-center p-8">
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  <span>Analisando arquivo...</span>
              </div>
            )}

            {(parsedRows.length > 0 || errors.length > 0) && (
              <>
                 <Alert variant={hasErrors ? "destructive" : "default"}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Resultado da Análise do Arquivo: {fileName}</AlertTitle>
                    <AlertDescription>
                      Encontrados {validOrderCount} pedidos válidos e {errors.length} erros. Apenas os pedidos válidos serão importados.
                    </AlertDescription>
                </Alert>

                {errors.length > 0 && (
                    <ScrollArea className="h-32 border rounded-md p-2">
                        <ul className="text-xs text-destructive space-y-1">
                            {errors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                    </ScrollArea>
                )}
              </>
            )}
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

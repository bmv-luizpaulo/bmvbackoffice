'use client';

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2,
  X
} from 'lucide-react';
import type { Contact } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import * as XLSX from 'xlsx';
import { format } from "date-fns";

type ContactImportExportDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contacts: Contact[];
};

type ImportResult = {
  success: number;
  errors: string[];
  total: number;
};

// Mapeamento dos cabeçalhos esperados para os campos do tipo Contact
const headerMapping: { [key: string]: keyof Partial<Contact> | 'address.cep' | 'address.rua' | 'address.cidade' | 'address.numero' | 'address.complemento' | 'address.bairro' | 'address.pais' } = {
  'nome': 'firstName',
  'sobrenome': 'lastName',
  'email': 'email',
  'celular': 'celular',
  'telefone': 'telefone',
  'data criação': 'createdAt',
  'situação': 'situacao',
  'tipo': 'tipo',
  'cpf/cnpj': 'documento',
  'tipo documento': 'tipoDocumento',
  'autenticação': 'autenticacao',
  'cep': 'address.cep',
  'rua': 'address.rua',
  'cidade': 'address.cidade',
  'número': 'address.numero',
  'complemento': 'address.complemento',
  'bairro': 'address.bairro',
  'país': 'address.pais',
};


export function ContactImportExportDialog({ isOpen, onOpenChange, contacts }: ContactImportExportDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isImporting, setIsImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportCSV = () => {
    const dataToExport = contacts.map(contact => ({
      'Nome': contact.firstName,
      'Sobrenome': contact.lastName,
      'Email': contact.email,
      'Celular': contact.celular,
      'Telefone': contact.telefone,
      'Data criação': contact.createdAt?.toDate ? format(contact.createdAt.toDate(), 'dd/MM/yyyy') : '',
      'Situação': contact.situacao,
      'Tipo': contact.tipo,
      'CPF/CNPJ': contact.documento,
      'Tipo documento': contact.tipoDocumento,
      'Autenticação': contact.autenticacao,
      'CEP': contact.address?.cep,
      'Rua': contact.address?.rua,
      'Cidade': contact.address?.cidade,
      'Número': contact.address?.numero,
      'Complemento': contact.address?.complemento,
      'Bairro': contact.address?.bairro,
      'País': contact.address?.pais,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contatos");
    XLSX.writeFile(workbook, `contatos_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({ title: "Exportação Concluída", description: "Arquivo XLSX baixado com sucesso." });
  };

  const handleExportTemplate = () => {
    const headers = [
      'Nome', 'Sobrenome', 'Email', 'Celular', 'Telefone', 'Data criação', 
      'Situação', 'Tipo', 'CPF/CNPJ', 'Tipo documento', 'Autenticação', 
      'CEP', 'Rua', 'Cidade', 'Número', 'Complemento', 'Bairro', 'País'
    ];
    const exampleRow = [
      'João', 'Silva', 'joao.silva@example.com', '(11) 99999-9999', '(11) 5555-5555', new Date().toLocaleDateString('pt-BR'),
      'Ativo', 'cliente', '123.456.789-00', 'CPF', 'Pendente',
      '01234-567', 'Rua das Flores', 'São Paulo', '123', 'Apto 45', 'Centro', 'Brasil'
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "template_contatos.xlsx");
    
    toast({ title: "Template Baixado", description: "Use este arquivo .xlsx como modelo para importação." });
  };

  const processRow = (row: any, rowIndex: number): Partial<Contact> | { error: string } => {
    const contactData: Partial<Contact> = {};
    const address: Partial<Contact['address']> = {};

    for (const header in row) {
        const normalizedHeader = header.toLowerCase().trim();
        const fieldKey = headerMapping[normalizedHeader];
        if (fieldKey) {
            const value = row[header] !== null && row[header] !== undefined ? String(row[header]).trim() : '';
            if (fieldKey.startsWith('address.')) {
                (address as any)[fieldKey.split('.')[1]] = value;
            } else {
                (contactData as any)[fieldKey] = value;
            }
        }
    }
    
    if (Object.keys(address).length > 0) {
        contactData.address = address as any;
    }

    if (!contactData.email) {
      return { error: `Linha ${rowIndex + 2}: Email é obrigatório.` };
    }
    if (!contactData.documento) {
        return { error: `Linha ${rowIndex + 2}: CPF/CNPJ é obrigatório.` };
    }
    if (!contactData.tipoDocumento || !['CPF', 'CNPJ'].includes(contactData.tipoDocumento)) {
        return { error: `Linha ${rowIndex + 2}: Tipo de documento inválido. Use CPF ou CNPJ.` };
    }

    // Valores padrão para enums se não forem fornecidos ou forem inválidos
    contactData.situacao = ['Ativo', 'Inativo', 'Bloqueado'].includes(contactData.situacao as any) ? contactData.situacao : 'Ativo';
    contactData.tipo = ['cliente', 'fornecedor', 'parceiro'].includes(contactData.tipo as any) ? contactData.tipo : 'cliente';
    contactData.autenticacao = ['Verificado', 'Não verificado', 'Pendente'].includes(contactData.autenticacao as any) ? contactData.autenticacao : 'Pendente';
    
    return contactData;
  };


  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast({ variant: "destructive", title: "Formato Inválido", description: "Por favor, selecione um arquivo CSV ou XLSX." });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      const dataRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      
      if (dataRows.length < 1) {
        throw new Error("Arquivo deve conter pelo menos uma linha de dados.");
      }

      const errors: string[] = [];
      let successCount = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        setImportProgress(((i + 1) / dataRows.length) * 100);

        try {
          const contactData = processRow(row, i);
          if ('error' in contactData) {
            errors.push(contactData.error);
            continue;
          }

          if (firestore) {
            await addDoc(collection(firestore, 'contacts'), { ...contactData, createdAt: serverTimestamp() } as any);
            successCount++;
          }
        } catch (error) {
          errors.push(`Linha ${i + 2}: Erro ao processar - ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setImportResult({
        success: successCount,
        errors: errors.slice(0, 10), // Mostrar apenas os primeiros 10 erros
        total: dataRows.length
      });

      if (successCount > 0) {
        toast({ title: "Importação Concluída", description: `${successCount} contatos importados com sucesso.` });
      }

    } catch (error) {
      toast({ variant: "destructive", title: "Erro na Importação", description: error instanceof Error ? error.message : "Erro desconhecido" });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar/Exportar Contatos
          </DialogTitle>
          <DialogDescription>
            Importe contatos de um arquivo CSV ou XLSX, ou exporte a lista atual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Exportar */}
          <div className="space-y-3">
            <h3 className="font-medium">Exportar Contatos</h3>
            <div className="flex gap-2">
              <Button onClick={handleExportCSV} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Exportar Lista Atual (XLSX)
              </Button>
              <Button variant="outline" onClick={handleExportTemplate}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Baixar Template (XLSX)
              </Button>
            </div>
          </div>

          {/* Importar */}
          <div className="space-y-3">
            <h3 className="font-medium">Importar Contatos</h3>
            <div className="space-y-2">
              <Label htmlFor="file-upload">Arquivo (CSV ou XLSX)</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileImport}
                disabled={isImporting}
                ref={fileInputRef}
              />
              <p className="text-sm text-muted-foreground">
                Campos obrigatórios: Email, CPF/CNPJ, Tipo documento. Use o template para o formato correto.
              </p>
            </div>

            {isImporting && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Importando...</span>
                  <span className="text-sm text-muted-foreground">{Math.round(importProgress)}%</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}

            {importResult && (
              <Alert className={importResult.errors.length > 0 ? "border-yellow-200" : "border-green-200"}>
                <div className="flex items-start gap-2">
                  {importResult.errors.length > 0 ? (
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                  )}
                  <div className="space-y-2">
                    <AlertDescription>
                      <strong>Resultado da Importação:</strong>
                      <br />
                      • {importResult.success} de {importResult.total} contatos importados com sucesso
                    </AlertDescription>
                    
                    {importResult.errors.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Erros encontrados:</p>
                        <ul className="text-sm space-y-1">
                          {importResult.errors.map((error, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <X className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

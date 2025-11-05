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
import { collection, addDoc } from "firebase/firestore";

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

export function ContactImportExportDialog({ isOpen, onOpenChange, contacts }: ContactImportExportDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isImporting, setIsImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Empresa',
      'Nome',
      'Sobrenome',
      'Cargo',
      'Data de Nascimento',
      'Vendedor',
      'Gestor',
      'Rua/Av',
      'N°',
      'Complemento',
      'CEP',
      'Bairro',
      'Cidade',
      'Estado',
      'País',
      'Celular 1',
      'Celular 2',
      'Telefone 1',
      'Telefone 2',
      'E-mail',
      'WebSite',
      'Observações'
    ];

    const csvData = contacts.map(contact => [
      contact.id || '',
      contact.legalName || contact.fullName || '',
      contact.fullName?.split(' ')[0] || '',
      contact.fullName?.split(' ').slice(1).join(' ') || '',
      contact.position || '',
      contact.birthDate || '',
      contact.salesperson || '',
      contact.manager || '',
      contact.address?.street || '',
      contact.address?.number || '',
      contact.address?.complement || '',
      contact.address?.zipCode || '',
      contact.address?.neighborhood || '',
      contact.address?.city || '',
      contact.address?.state || '',
      contact.address?.country || 'Brasil',
      contact.phone || '',
      contact.phone2 || '',
      contact.landline || '',
      contact.landline2 || '',
      contact.email || '',
      contact.website || '',
      contact.observations || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    // Adicionar BOM UTF-8
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `contatos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Exportação Concluída", description: "Arquivo CSV baixado com sucesso." });
  };

  const handleExportTemplate = () => {
    const headers = [
      'ID',
      'Empresa*',
      'Nome*',
      'Sobrenome',
      'Cargo',
      'Data de Nascimento',
      'Vendedor',
      'Gestor',
      'Rua/Av',
      'N°',
      'Complemento',
      'CEP',
      'Bairro',
      'Cidade',
      'Estado',
      'País',
      'Celular 1',
      'Celular 2',
      'Telefone 1',
      'Telefone 2',
      'E-mail*',
      'WebSite',
      'Observações'
    ];

    const exampleRow = [
      '',
      'Empresa ABC Ltda',
      'João',
      'Silva Santos',
      'Gerente Comercial',
      '15/03/1985',
      'Maria Vendedora',
      'Carlos Gestor',
      'Rua das Flores',
      '123',
      'Sala 45',
      '01234-567',
      'Centro',
      'São Paulo',
      'SP',
      'Brasil',
      '(11) 99999-9999',
      '(11) 88888-8888',
      '(11) 3333-4444',
      '(11) 2222-3333',
      'joao.silva@empresa.com',
      'https://www.empresa.com',
      'Cliente preferencial'
    ];

    const csvContent = [headers, exampleRow]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    // Adicionar BOM UTF-8
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_contatos.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Template Baixado", description: "Use este arquivo como modelo para importação." });
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n');
    const result: string[][] = [];
    
    for (const line of lines) {
      if (line.trim()) {
        const fields = line.split(',').map(field => 
          field.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"')
        );
        result.push(fields);
      }
    }
    
    return result;
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({ variant: "destructive", title: "Formato Inválido", description: "Por favor, selecione um arquivo CSV." });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        throw new Error("Arquivo deve conter pelo menos um cabeçalho e uma linha de dados.");
      }

      const [headers, ...dataRows] = rows;
      const errors: string[] = [];
      let successCount = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        setImportProgress(((i + 1) / dataRows.length) * 100);

        try {
          const [
            id, empresa, nome, sobrenome, cargo, dataNascimento, vendedor, gestor,
            rua, numero, complemento, cep, bairro, cidade, estado, pais,
            celular1, celular2, telefone1, telefone2, email, website, observacoes
          ] = row;

          if (!nome || !email) {
            errors.push(`Linha ${i + 2}: Nome e email são obrigatórios`);
            continue;
          }

          // Determinar tipo de pessoa baseado na presença de empresa
          const isCompany = empresa && empresa.trim() !== '';
          const fullName = `${nome.trim()} ${sobrenome?.trim() || ''}`.trim();

          const contactData: Omit<Contact, 'id'> = {
            type: 'cliente', // Assumindo que são clientes
            personType: isCompany ? 'Pessoa Jurídica' : 'Pessoa Física',
            
            // Pessoa Física
            fullName: isCompany ? undefined : fullName,
            
            // Pessoa Jurídica
            legalName: isCompany ? empresa.trim() : undefined,
            contactPerson: isCompany ? fullName : undefined,
            
            // Campos comuns
            email: email.trim().toLowerCase(),
            phone: celular1?.trim() || undefined,
            phone2: celular2?.trim() || undefined,
            landline: telefone1?.trim() || undefined,
            landline2: telefone2?.trim() || undefined,
            website: website?.trim() || undefined,
            position: cargo?.trim() || undefined,
            birthDate: dataNascimento?.trim() || undefined,
            salesperson: vendedor?.trim() || undefined,
            manager: gestor?.trim() || undefined,
            observations: observacoes?.trim() || undefined,
            
            address: (rua || numero || cidade) ? {
              street: rua?.trim() || undefined,
              number: numero?.trim() || undefined,
              complement: complemento?.trim() || undefined,
              neighborhood: bairro?.trim() || undefined,
              city: cidade?.trim() || undefined,
              state: estado?.trim() || undefined,
              zipCode: cep?.trim() || undefined,
              country: pais?.trim() || 'Brasil'
            } : undefined
          };

          if (firestore) {
            await addDoc(collection(firestore, 'contacts'), contactData);
            successCount++;
          }
        } catch (error) {
          errors.push(`Linha ${i + 2}: Erro ao processar dados - ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }

        // Pequena pausa para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setImportResult({
        success: successCount,
        errors: errors.slice(0, 10), // Mostrar apenas os primeiros 10 erros
        total: dataRows.length
      });

      if (successCount > 0) {
        toast({ 
          title: "Importação Concluída", 
          description: `${successCount} contatos importados com sucesso.` 
        });
      }

    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Erro na Importação", 
        description: error instanceof Error ? error.message : "Erro desconhecido" 
      });
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
            Importe contatos de um arquivo CSV ou exporte a lista atual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Exportar */}
          <div className="space-y-3">
            <h3 className="font-medium">Exportar Contatos</h3>
            <div className="flex gap-2">
              <Button onClick={handleExportCSV} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Exportar Lista Atual
              </Button>
              <Button variant="outline" onClick={handleExportTemplate}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Baixar Template
              </Button>
            </div>
          </div>

          {/* Importar */}
          <div className="space-y-3">
            <h3 className="font-medium">Importar Contatos</h3>
            <div className="space-y-2">
              <Label htmlFor="csv-file">Arquivo CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                disabled={isImporting}
                ref={fileInputRef}
              />
              <p className="text-sm text-muted-foreground">
                Campos obrigatórios: Nome, Email. Se "Empresa" estiver preenchida, será tratado como Pessoa Jurídica.
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

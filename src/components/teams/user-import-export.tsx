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
import type { User, Role } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { createUserAction } from "@/lib/actions";

type ImportExportDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  users: User[];
  roles: Role[];
};

type ImportResult = {
  success: number;
  errors: string[];
  total: number;
};

export function UserImportExportDialog({ isOpen, onOpenChange, users, roles }: ImportExportDialogProps) {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportCSV = () => {
    const headers = [
      'Nome',
      'Email', 
      'Telefone',
      'CPF',
      'LinkedIn',
      'Cargo',
      'Status',
      'Rua',
      'Número',
      'Complemento',
      'Bairro',
      'Cidade',
      'Estado',
      'CEP'
    ];

    const csvData = users.map(user => {
      const role = roles.find(r => r.id === user.roleId);
      const statusLabels = { active: 'Ativo', inactive: 'Inativo', suspended: 'Suspenso' };
      return [
        user.name || '',
        user.email || '',
        user.phone || '',
        user.personalDocument || '',
        user.linkedinUrl || '',
        role?.name || '',
        statusLabels[user.status as keyof typeof statusLabels] || 'Ativo',
        user.address?.street || '',
        user.address?.number || '',
        user.address?.complement || '',
        user.address?.neighborhood || '',
        user.address?.city || '',
        user.address?.state || '',
        user.address?.zipCode || ''
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${(field || '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    // Adicionar BOM (Byte Order Mark) para UTF-8 para garantir compatibilidade com Excel
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Exportação Concluída", description: "Arquivo CSV baixado com sucesso." });
  };

  const handleExportTemplate = () => {
    const headers = [
      'Nome*',
      'Email*', 
      'Telefone',
      'CPF',
      'LinkedIn',
      'Cargo',
      'Status',
      'Rua',
      'Número',
      'Complemento',
      'Bairro',
      'Cidade',
      'Estado',
      'CEP'
    ];

    const exampleRow = [
      'João da Silva',
      'joao.silva@empresa.com',
      '(11) 99999-9999',
      '123.456.789-00',
      'https://linkedin.com/in/joao-silva',
      'Desenvolvedor',
      'Ativo',
      'Rua das Flores',
      '123',
      'Apto 45',
      'Centro',
      'São Paulo',
      'SP',
      '01234-567'
    ];

    const csvContent = [headers, exampleRow]
      .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    // Adicionar BOM para UTF-8
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_usuarios.csv');
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
          field.trim().replace(/^"(.*)"$/, '$1')
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
          const [name, email, phone, personalDocument, linkedinUrl, roleName, status, street, number, complement, neighborhood, city, state, zipCode] = row;

          if (!name || !email) {
            errors.push(`Linha ${i + 2}: Nome e email são obrigatórios`);
            continue;
          }

          // Encontrar cargo por nome
          const role = roles.find(r => r.name.toLowerCase() === roleName?.toLowerCase());

          // Mapear status em português e inglês
          const normalizeStatus = (statusValue: string): 'active' | 'inactive' | 'suspended' => {
            const statusLower = statusValue?.toLowerCase().trim();
            if (statusLower === 'inactive' || statusLower === 'inativo') return 'inactive';
            if (statusLower === 'suspended' || statusLower === 'suspenso') return 'suspended';
            return 'active'; // Default para ativo
          };

          const userData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone?.trim() || undefined,
            personalDocument: personalDocument?.trim() || undefined,
            linkedinUrl: linkedinUrl?.trim() || undefined,
            roleId: role?.id,
            status: normalizeStatus(status || ''),
            address: (street || number || city) ? {
              street: street?.trim() || undefined,
              number: number?.trim() || undefined,
              complement: complement?.trim() || undefined,
              neighborhood: neighborhood?.trim() || undefined,
              city: city?.trim() || undefined,
              state: state?.trim() || undefined,
              zipCode: zipCode?.trim() || undefined,
            } : undefined
          };

          const result = await createUserAction(userData as any);
          if (result.success) {
            successCount++;
          } else {
            errors.push(`Linha ${i + 2}: ${result.error}`);
          }
        } catch (error) {
          errors.push(`Linha ${i + 2}: Erro ao processar dados`);
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
          description: `${successCount} usuários importados com sucesso.` 
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
            Importar/Exportar Usuários
          </DialogTitle>
          <DialogDescription>
            Importe usuários de um arquivo CSV ou exporte a lista atual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Exportar */}
          <div className="space-y-3">
            <h3 className="font-medium">Exportar Usuários</h3>
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
            <h3 className="font-medium">Importar Usuários</h3>
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
                Campos obrigatórios: Nome, Email. Use o template para formato correto.
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
                      • {importResult.success} de {importResult.total} usuários importados com sucesso
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

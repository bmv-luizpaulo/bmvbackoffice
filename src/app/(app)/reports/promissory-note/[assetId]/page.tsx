'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, FirebaseClientProvider } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Asset, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function PromissoryNoteReportContent() {
  const params = useParams();
  const firestore = useFirestore();
  const assetId = params.assetId as string;
  const reportRef = React.useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>('');

  const assetRef = useMemoFirebase(
    () => (firestore && assetId ? doc(firestore, 'assets', assetId) : null),
    [firestore, assetId]
  );
  const { data: asset, isLoading: isLoadingAsset } = useDoc<Asset>(assetRef);

  const assigneeRef = useMemoFirebase(
    () => (firestore && asset?.assigneeId ? doc(firestore, 'users', asset.assigneeId) : null),
    [firestore, asset?.assigneeId]
  );
  const { data: assignee, isLoading: isLoadingAssignee } = useDoc<User>(assigneeRef);
  const noteTemplates = React.useMemo(() => ([
    {
      id: 'default_note',
      name: 'Nota Promissória Padrão',
      type: 'promissory_note',
      content: 'Pagarei a quantia referente ao {{asset.name}} ao favorecido, conforme condições acordadas. Devedor: {{user.name}}. Data: {{today}}.',
    },
  ]), []);
  const activeTemplate = React.useMemo(() => noteTemplates.find((t: any) => t.id === selectedTemplateId), [noteTemplates, selectedTemplateId]);

  const isLoading = isLoadingAsset || isLoadingAssignee;
  const [generationDate] = React.useState(new Date());

  const handleGeneratePdf = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      const imgWidth = pdfWidth - 20;
      const imgHeight = imgWidth / ratio;
      let heightLeft = imgHeight;
      let position = 10;
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);
      while (heightLeft > 0) {
        position = -heightLeft - 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }
      pdf.save(`Nota_Promissoria_${assignee?.name || 'responsavel'}.pdf`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-700" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white p-8">
        <div className="text-center">
          <h1 className="text-xl font-bold">Dados não encontrados</h1>
          <Button onClick={() => window.history.back()} className="mt-4">Voltar</Button>
        </div>
      </div>
    );
  }

  const merge = (content: string) => {
    if (!content) return '';
    return content
      .replace(/\{\{asset.name\}\}/g, asset?.name || '')
      .replace(/\{\{asset.serialNumber\}\}/g, asset?.serialNumber || '')
      .replace(/\{\{asset.type\}\}/g, asset?.type || '')
      .replace(/\{\{user.name\}\}/g, assignee?.name || '')
      .replace(/\{\{user.email\}\}/g, assignee?.email || '')
      .replace(/\{\{user.phone\}\}/g, assignee?.phone || '');
  };

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <header className="bg-gray-100 p-4 print:hidden flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
          >
            <option value="">Modelo padrão</option>
            {noteTemplates.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
          {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          {isGeneratingPdf ? 'Gerando...' : 'Gerar PDF'}
        </Button>
      </header>

      <div className="p-4 sm:p-8">
        <div ref={reportRef} className="mx-auto max-w-3xl bg-white p-10 shadow-lg print:shadow-none">
          <header className="flex items-start justify-between border-b pb-4">
            <img src="/image/BMV.png" alt="BMV Logo" style={{ width: '150px', height: 'auto' }} />
            <div className="text-right">
              <h1 className="text-2xl font-bold text-gray-800">Nota Promissória</h1>
              <p className="text-sm text-gray-500">Data de Emissão: {generationDate.toLocaleDateString('pt-BR')}</p>
            </div>
          </header>

          <main className="mt-8 space-y-6 text-gray-800">
            <section>
              <h2 className="font-semibold">Devedor</h2>
              <div className="mt-2 text-sm">
                <p><strong>Nome:</strong> {assignee?.name || 'N/D'}</p>
                <p><strong>Email:</strong> {assignee?.email || 'N/D'}</p>
                <p><strong>Telefone:</strong> {assignee?.phone || 'N/D'}</p>
              </div>
            </section>

            <section>
              <h2 className="font-semibold">Detalhes</h2>
              <div className="mt-2 text-sm">
                <p><strong>Valor:</strong> R$ ____________</p>
                <p><strong>Vencimento:</strong> ____/____/______</p>
                <p><strong>Referente a:</strong> {asset?.name || 'Ativo'}</p>
              </div>
            </section>

            <section>
              {activeTemplate?.content ? (
                <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{merge(activeTemplate.content)}</div>
              ) : (
                <p className="mt-2 text-sm leading-relaxed">
                  Pelo presente, prometo pagar a quantia acima especificada, na data de vencimento indicada, ao favorecido, livre de quaisquer impostos e encargos.
                </p>
              )}
            </section>

            <section className="grid grid-cols-2 gap-12 mt-12">
              <div>
                <div className="h-12 border-b" />
                <p className="text-center text-sm mt-2">Assinatura do Devedor</p>
              </div>
              <div>
                <div className="h-12 border-b" />
                <p className="text-center text-sm mt-2">Assinatura da Empresa</p>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function PromissoryNoteReportPage() {
  return (
    <FirebaseClientProvider>
      <PromissoryNoteReportContent />
    </FirebaseClientProvider>
  );
}

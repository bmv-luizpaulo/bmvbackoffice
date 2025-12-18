'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, FirebaseClientProvider } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Asset, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Image from 'next/image';

function AssetReturnReportContent() {
  const params = useParams();
  const firestore = useFirestore();
  const assetId = params.assetId as string;
  const reportRef = React.useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

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

  const isLoading = isLoadingAsset || isLoadingAssignee;
  const [generationDate] = React.useState(new Date());

  const handleGeneratePdf = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const imgWidth = pdfWidth;
      let imgHeight = imgWidth / ratio;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = -imgHeight + heightLeft;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`Termo_Devolucao_${asset?.name?.replace(/\s/g, '_') || assetId}.pdf`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!asset || !assignee) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white p-8">
        <div className="text-center">
          <h1 className="font-headline text-xl font-bold">Ativo ou responsável não encontrado</h1>
          <p className="text-muted-foreground">Não foi possível gerar o termo.</p>
          <Button onClick={() => window.history.back()} className="mt-4">Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white font-sans">
      <header className="bg-gray-100 p-4 print:hidden flex items-center justify-between sticky top-0 z-20">
        <h2 className='font-headline text-lg'>Preview: Termo de Devolução</h2>
        <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
          {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          {isGeneratingPdf ? 'Gerando...' : 'Gerar PDF'}
        </Button>
      </header>

      <main className="p-4 sm:p-8">
        <div ref={reportRef} className="mx-auto max-w-4xl bg-white p-12 shadow-lg print:shadow-none A4-container">
          <header className="flex items-start justify-between border-b border-gray-300 pb-6">
            <Image src="/image/BMV.png" alt="BMV Logo" width={150} height={50} />
            <div className="text-right">
              <h1 className="font-headline text-3xl font-bold text-gray-800">Termo de Devolução de Ativo</h1>
              <p className="text-sm text-gray-500">Emitido em: {generationDate.toLocaleDateString('pt-BR')}</p>
            </div>
          </header>

          <section className="mt-8 space-y-6 text-gray-800">
            <p className="leading-relaxed">
              Pelo presente instrumento, o(a) colaborador(a) <strong>{assignee.name}</strong>, CPF nº <strong>{assignee.personalDocument || 'Não informado'}</strong>, doravante denominado(a) RESPONSÁVEL, formaliza a devolução à <strong>BMV Global</strong>, doravante CONCEDENTE, do ativo que esteve sob sua guarda e responsabilidade.
            </p>

            <div className="space-y-4 rounded-lg border bg-gray-50 p-6">
              <div>
                <h2 className="font-headline font-semibold text-lg text-gray-700">Dados do Ativo</h2>
                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <p><strong>Nome:</strong> {asset.name}</p>
                  <p><strong>Nº de Série:</strong> {asset.serialNumber || 'N/D'}</p>
                  <p><strong>Tipo:</strong> {asset.type}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-headline font-semibold text-lg text-gray-700">Condições de Devolução</h3>
              <p className="text-sm leading-relaxed">
                O(A) RESPONSÁVEL declara devolver o ativo nas condições vistoriadas pela CONCEDENTE na presente data. A assinatura deste termo quita as obrigações do(a) RESPONSÁVEL quanto à guarda do equipamento, salvo por danos ocultos ou de mau uso identificados posteriormente.
              </p>
              <div className="pt-4">
                <p className="text-sm"><strong>Estado do Ativo na Devolução:</strong> _________________________________________</p>
              </div>
            </div>

            <div className="pt-24 text-center text-sm space-y-12">
              <div className="grid grid-cols-2 gap-12">
                 <div>
                    <div className="h-12 border-b border-gray-400" />
                    <p className="mt-2"><strong>{assignee.name}</strong></p>
                    <p className="text-xs text-gray-500">RESPONSÁVEL</p>
                 </div>
                 <div>
                    <div className="h-12 border-b border-gray-400" />
                     <p className="mt-2"><strong>Representante da BMV Global</strong></p>
                    <p className="text-xs text-gray-500">CONCEDENTE</p>
                 </div>
              </div>
            </div>
          </section>
          
          <footer className="mt-12 border-t border-gray-300 pt-4 text-center text-xs text-gray-400">
            BMV Global | Documento confidencial de uso interno
          </footer>
        </div>
      </main>
    </div>
  );
}

export default function AssetReturnReportPage() {
  return (
    <FirebaseClientProvider>
      <AssetReturnReportContent />
    </FirebaseClientProvider>
  );
}

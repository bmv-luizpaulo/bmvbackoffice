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

function PromissoryNoteReportContent() {
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
      
      pdf.save(`Nota_Promissoria_${assignee?.name?.replace(/\s/g, '_') || 'responsavel'}.pdf`);
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
          <p className="text-muted-foreground">Não foi possível gerar o documento.</p>
          <Button onClick={() => window.history.back()} className="mt-4">Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white font-sans">
      <header className="bg-gray-100 p-4 print:hidden flex items-center justify-between sticky top-0 z-20">
        <h2 className='font-headline text-lg'>Preview: Nota Promissória</h2>
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
              <h1 className="font-headline text-3xl font-bold text-gray-800">Nota Promissória</h1>
              <p className="text-sm text-gray-500">Emitido em: {generationDate.toLocaleDateString('pt-BR')}</p>
            </div>
          </header>

          <section className="mt-8 space-y-8 text-gray-800">
            <div className='border-2 border-dashed p-4 space-y-6'>
                <div className='grid grid-cols-3 gap-4 text-sm'>
                    <p><strong>Nº:</strong> _____________</p>
                    <p><strong>Vencimento:</strong> ____/____/______</p>
                    <p><strong>Valor: R$</strong> ________________</p>
                </div>
                <p className='leading-relaxed'>
                    Aos ____ dias do mês de ____________ de ______, eu, <strong>{assignee.name}</strong>, inscrito(a) sob o CPF nº <strong>{assignee.personalDocument || 'Não informado'}</strong>, pagarei por esta única via de nota promissória à <strong>BMV Global</strong>, a quantia de ________________________________________________ em moeda corrente deste país, referente à garantia do ativo <strong>{asset.name}</strong> (S/N: {asset.serialNumber || 'N/D'}).
                </p>
                 <div className='grid grid-cols-2 gap-4 text-sm'>
                    <div>
                        <p><strong>Emitente:</strong> {assignee.name}</p>
                        <p><strong>CPF:</strong> {assignee.personalDocument || 'Não informado'}</p>
                    </div>
                    <div className='text-right'>
                        <p><strong>Local de Pagamento:</strong> ___________________</p>
                    </div>
                 </div>
            </div>
            
            <div className="pt-24 text-center text-sm">
              <div className="mx-auto max-w-xs">
                <div className="h-12 border-b border-gray-400" />
                <p className="mt-2"><strong>{assignee.name}</strong></p>
                <p className="text-xs text-gray-500">Assinatura do Emitente</p>
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

export default function PromissoryNoteReportPage() {
  return (
    <FirebaseClientProvider>
      <PromissoryNoteReportContent />
    </FirebaseClientProvider>
  );
}

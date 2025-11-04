'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import type { Checklist, ChecklistItem, Team, User as UserType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, Check, X, MessageSquare, CheckSquare, ShieldAlert, Download } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ChecklistReportPage() {
  const params = useParams();
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const checklistId = params.checklistId as string;
  const reportRef = React.useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);


  const checklistRef = useMemoFirebase(() => (firestore && checklistId ? doc(firestore, 'checklists', checklistId) : null), [firestore, checklistId]);
  const { data: checklist, isLoading: isLoadingChecklist } = useDoc<Checklist>(checklistRef);

  const itemsRef = useMemoFirebase(() => (firestore && checklistId ? query(collection(firestore, `checklists/${checklistId}/items`), orderBy('order')) : null), [firestore, checklistId]);
  const { data: items, isLoading: isLoadingItems } = useCollection<ChecklistItem>(itemsRef);
  
  const teamId = checklist?.teamId;
  const teamRef = useMemoFirebase(() => (firestore && teamId ? doc(firestore, 'teams', teamId) : null), [firestore, teamId]);
  const { data: team, isLoading: isLoadingTeam } = useDoc<Team>(teamRef);
  
  const userProfileRef = useMemoFirebase(() => firestore && authUser?.uid ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser?.uid]);
  const { data: userProfile, isLoading: isLoadingUserProfile } = useDoc<UserType>(userProfileRef);

  const isLoading = isLoadingChecklist || isLoadingItems || isLoadingTeam || isLoadingUserProfile;

  const [generationDate] = React.useState(new Date());
  
  const handleGeneratePdf = async () => {
    const input = reportRef.current;
    if (!input || !checklist) {
      return;
    }

    setIsGeneratingPdf(true);

    try {
      const canvas = await html2canvas(input, {
        scale: 2, // Aumenta a resolução para melhor qualidade
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Orientação e dimensões para um A4 padrão
      const pdf = new jsPDF({
        orientation: 'p', // portrait
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      
      let imgWidth = pdfWidth - 20; // Margem de 10mm de cada lado
      let imgHeight = imgWidth / ratio;
      
      // Se a altura da imagem for maior que a altura do PDF, recalcula baseado na altura
      if (imgHeight > pdfHeight - 20) {
        imgHeight = pdfHeight - 20; // Margem de 10mm em cima e embaixo
        imgWidth = imgHeight * ratio;
      }
      
      const x = (pdfWidth - imgWidth) / 2;
      const y = 10; // Margem de 10mm no topo
      
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`Relatorio_Checklist_${checklist.name.replace(/ /g, '_')}.pdf`);

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
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

  if (!checklist || !items) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white p-8">
        <div className="text-center">
            <h1 className="text-xl font-bold">Erro ao Gerar Relatório</h1>
            <p className="text-gray-600">Não foi possível encontrar os dados do checklist.</p>
            <Button onClick={() => window.history.back()} className='mt-4'>Voltar</Button>
        </div>
      </div>
    );
  }
  
  const completableItems = items.filter(item => item.type === 'item' || item.type === 'yes_no');
  const completedItems = completableItems.filter(item => (item.type === 'item' && item.isCompleted) || (item.type === 'yes_no' && item.answer !== 'unanswered')).length;
  const progress = completableItems.length > 0 ? (completedItems / completableItems.length) * 100 : 0;


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 print:bg-white print:p-0">
        <div className="fixed top-4 right-4 print:hidden">
            <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
                {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isGeneratingPdf ? 'Gerando...' : 'Baixar PDF'}
            </Button>
        </div>
      <div ref={reportRef} className="mx-auto max-w-4xl bg-white p-12 shadow-lg print:shadow-none">
        <header className="flex items-start justify-between border-b pb-4">
            <div className="flex items-center gap-4">
                <Image src="/image/BMV.png" alt="BMV Logo" width={150} height={50} />
            </div>
            <div className="text-right">
                <h1 className="text-2xl font-bold text-gray-800">Relatório de Checklist</h1>
                <p className="text-sm text-gray-500">Data de Emissão: {generationDate.toLocaleDateString('pt-BR')}</p>
            </div>
        </header>

        <main className="mt-8">
            <section className='mb-8'>
                <h2 className="text-xl font-semibold uppercase tracking-wider text-gray-700">
                    {checklist.name}
                </h2>
                <p className="mt-1 text-sm text-gray-600">{checklist.description}</p>
                <div className='flex gap-8 mt-2 text-sm text-gray-600'>
                    <p><strong>Equipe:</strong> {team?.name || 'N/D'}</p>
                    <p><strong>Progresso:</strong> {Math.round(progress)}%</p>
                </div>
            </section>
            
            <Separator className="my-6" />

            <section className="space-y-4">
                <div className='border rounded-lg'>
                  <div className='flex items-center bg-gray-50 p-3 text-xs font-semibold uppercase text-gray-500 border-b'>
                    <div className='flex-1 px-2'>Descrição</div>
                    <div className='w-1/4 px-2'>Resultado / Comentário</div>
                    <div className='w-24 text-center'>Status</div>
                  </div>
                  <div className='divide-y'>
                    {items.map(item => {
                        if (item.type === 'header') {
                            return (
                                <div key={item.id} className="bg-gray-100 p-3 font-bold text-sm text-gray-600 flex items-center gap-2">
                                    {item.description}
                                </div>
                            )
                        }
                        if (item.type === 'item') {
                            return (
                                <div key={item.id} className="flex items-start text-sm p-3">
                                  <div className={cn('flex-1 px-2', item.isCompleted && 'line-through text-gray-500')}>
                                    {item.description}
                                  </div>
                                  <div className='w-1/4 px-2 text-gray-500 italic'>
                                    -
                                  </div>
                                  <div className='w-24 flex justify-center pt-0.5'>
                                    <CheckSquare className={cn("h-5 w-5", item.isCompleted ? 'text-green-600' : 'text-gray-300')} />
                                  </div>
                                </div>
                            )
                        }
                        if (item.type === 'yes_no') {
                            return (
                                <div key={item.id} className="flex items-start text-sm p-3">
                                   <div className='flex-1 px-2'>
                                    {item.description}
                                  </div>
                                   <div className='w-1/4 px-2 space-y-1'>
                                      {item.comment && (
                                          <div className='flex items-start gap-2 text-gray-600'>
                                              <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                                              <p className='italic text-xs'>"{item.comment}"</p>
                                          </div>
                                      )}
                                  </div>
                                   <div className='w-24 flex justify-center pt-0.5'>
                                     {item.answer === 'yes' && <Check className='h-5 w-5 text-green-600'/>}
                                     {item.answer === 'no' && <X className='h-5 w-5 text-red-600'/>}
                                     {item.answer === 'unanswered' && <div className="h-4 w-4 mt-0.5 border-2 rounded-sm border-gray-300" />}
                                  </div>
                                </div>
                            )
                        }
                        return null;
                    })}
                  </div>
                   {items.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        Nenhum item neste checklist.
                      </div>
                    )}
                </div>
            </section>
        </main>

        <footer className="mt-32 border-t pt-6 text-center">
            <p className="text-sm">Relatório gerado por: <strong>{userProfile?.name || authUser?.email || 'Usuário desconhecido'}</strong></p>
            <p className="text-xs text-gray-500">Em: {generationDate.toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}</p>
            <div className='mt-8 flex items-center justify-center gap-2 text-xs text-gray-400'>
              <ShieldAlert className='h-3 w-3' />
              <p>Este é um documento de uso interno e confidencial da BMV Global.</p>
            </div>
        </footer>

      </div>
    </div>
  );
}

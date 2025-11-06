'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, addDocumentNonBlocking, FirebaseClientProvider } from '@/firebase';
import { doc, collection, query, orderBy, writeBatch, serverTimestamp } from 'firebase/firestore';
import type { Checklist, ChecklistItem, Team, User as UserType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, MessageSquare, CheckSquare, ShieldAlert, Download, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';

function ChecklistReportPageContent() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const checklistId = params.checklistId as string;
  const reportRef = React.useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);
  const { toast } = useToast();


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

  const resetChecklist = async () => {
    if (!firestore || !items || items.length === 0) return;
    
    const batch = writeBatch(firestore);
    items.forEach(item => {
        const itemRef = doc(firestore, `checklists/${checklistId}/items/${item.id}`);
        if (item.type === 'item') {
            batch.update(itemRef, { isCompleted: false });
        } else if (item.type === 'yes_no') {
            batch.update(itemRef, { answer: 'unanswered', comment: '' });
        }
    });
    await batch.commit();
  };
  
  const handleGeneratePdfAndSave = async () => {
    if (!reportRef.current || !checklist || !items || !authUser || !firestore) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Dados insuficientes para gerar o relatório.' });
      return;
    }

    setIsGeneratingPdf(true);

    try {
      // 1. Salvar a execução do checklist
      const executionData = {
        checklistId: checklist.id,
        checklistName: checklist.name,
        createdAt: checklist.createdAt,
        teamId: checklist.teamId,
        executedAt: serverTimestamp(),
        executedBy: authUser.uid,
        items: items,
      };
      await addDocumentNonBlocking(collection(firestore, 'checklistExecutions'), executionData);
      
      // 2. Gerar o PDF (carregamento dinâmico para evitar SSR)
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      let imgWidth = pdfWidth - 20;
      let imgHeight = imgWidth / ratio;
      
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
      
      pdf.save(`Relatorio_Checklist_${checklist.name.replace(/ /g, '_')}.pdf`);
      
      // 3. Zerar o checklist
      await resetChecklist();

      toast({ title: 'Relatório Gerado e Salvo', description: 'A execução do checklist foi salva e o checklist foi zerado.'});
      router.push('/checklists');

    } catch (error) {
      console.error("Erro ao gerar PDF e salvar execução:", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Ocorreu um erro inesperado.' });
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
    <div className="min-h-screen bg-gray-100 print:bg-white">
        <header className="bg-gray-100 p-4 print:hidden flex justify-end sticky top-0 z-20">
            <Button onClick={handleGeneratePdfAndSave} disabled={isGeneratingPdf}>
                {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isGeneratingPdf ? 'Gerando e Salvando...' : 'Finalizar e Gerar PDF'}
            </Button>
        </header>

      <div className="p-4 sm:p-8">
        <div ref={reportRef} className="mx-auto max-w-4xl bg-white p-12 shadow-lg print:shadow-none">
            <header className="flex items-start justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <img src="/image/BMV.png" alt="BMV Logo" style={{ width: '150px', height: 'auto' }} />
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
                        {items.sort((a,b) => a.order - b.order).map(item => {
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
                                        {item.answer === 'unanswered' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
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

            <footer className="mt-24 border-t pt-6 text-center">
                <p className="text-sm">Relatório gerado por: <strong>{userProfile?.name || authUser?.email || 'Usuário desconhecido'}</strong></p>
                <p className="text-xs text-gray-500">Em: {generationDate.toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}</p>
                <div className='mt-8 flex items-center justify-center gap-2 text-xs text-gray-400'>
                <ShieldAlert className='h-3 w-3' />
                <p>Este é um documento de uso interno e confidencial da BMV Global.</p>
                </div>
            </footer>
        </div>
      </div>
    </div>
  );
}

export default function ChecklistReportProviderPage() {
  return (
    <FirebaseClientProvider>
      <ChecklistReportPageContent />
    </FirebaseClientProvider>
  );
}

'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, addDocumentNonBlocking, FirebaseClientProvider } from '@/firebase';
import { doc, collection, query, orderBy, writeBatch, serverTimestamp } from 'firebase/firestore';
import type { Checklist, ChecklistItem, Team, User as UserType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, MessageSquare, ShieldAlert, Download, BarChart2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

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
      
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      let imgWidth = pdfWidth;
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
      
      pdf.save(`Relatorio_${checklist.name.replace(/\s/g, '_')}.pdf`);
      
      await resetChecklist();
      toast({ title: 'Relatório Gerado e Salvo', description: 'A execução foi salva e o checklist zerado.'});
      router.push('/checklists');
    } catch (error) {
      console.error("Erro ao gerar PDF e salvar:", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Ocorreu um erro inesperado.' });
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

  if (!checklist || !items) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white p-8">
        <div className="text-center">
            <h1 className="font-headline text-xl font-bold">Erro ao Gerar Relatório</h1>
            <p className="text-muted-foreground">Não foi possível encontrar os dados do checklist.</p>
            <Button onClick={() => window.history.back()} className='mt-4'>Voltar</Button>
        </div>
      </div>
    );
  }
  
  const completableItems = items.filter(item => item.type === 'item' || item.type === 'yes_no');
  const answeredItems = completableItems.filter(item => (item.type === 'item' && item.isCompleted) || (item.type === 'yes_no' && item.answer !== 'unanswered'));
  const yesCount = completableItems.filter(item => item.type === 'yes_no' && item.answer === 'yes').length;
  const noCount = completableItems.filter(item => item.type === 'yes_no' && item.answer === 'no').length;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white font-sans">
        <header className="bg-gray-100 p-4 print:hidden flex items-center justify-between sticky top-0 z-20">
             <h2 className='font-headline text-lg'>Preview: Relatório de Checklist</h2>
            <Button onClick={handleGeneratePdfAndSave} disabled={isGeneratingPdf}>
                {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isGeneratingPdf ? 'Gerando...' : 'Finalizar e Gerar PDF'}
            </Button>
        </header>

      <main className="p-4 sm:p-8">
        <div ref={reportRef} className="mx-auto max-w-4xl bg-white p-12 shadow-lg print:shadow-none A4-container">
            <header className="flex items-start justify-between border-b border-gray-300 pb-6">
                <Image src="/image/BMV.png" alt="BMV Logo" width={150} height={50} />
                <div className="text-right">
                    <h1 className="font-headline text-3xl font-bold text-gray-800">Relatório de Checklist</h1>
                    <p className="text-sm text-gray-500">Emitido em: {generationDate.toLocaleDateString('pt-BR')}</p>
                </div>
            </header>

            <section className="mt-8">
                <h2 className="font-headline font-semibold text-xl text-gray-700">
                    {checklist.name}
                </h2>
                <p className="mt-1 text-sm text-gray-600">{checklist.description}</p>
                <div className='flex gap-8 mt-2 text-sm text-gray-600'>
                    <p><strong>Equipe:</strong> {team?.name || 'N/D'}</p>
                    <p><strong>Executado por:</strong> {userProfile?.name || 'N/D'}</p>
                </div>
            </section>
            
            <section className='mt-6 grid grid-cols-3 gap-4 text-center'>
                <div className='rounded-lg border bg-gray-50 p-4'>
                    <p className='font-headline text-2xl font-bold'>{answeredItems.length}/{completableItems.length}</p>
                    <p className='text-xs text-gray-500'>Itens Respondidos</p>
                </div>
                <div className='rounded-lg border bg-green-50 p-4'>
                    <p className='font-headline text-2xl font-bold text-green-700'>{yesCount}</p>
                    <p className='text-xs text-green-600'>Respostas "Sim"</p>
                </div>
                <div className='rounded-lg border bg-red-50 p-4'>
                    <p className='font-headline text-2xl font-bold text-red-700'>{noCount}</p>
                    <p className='text-xs text-red-600'>Respostas "Não"</p>
                </div>
            </section>

            <Separator className="my-8" />

            <section className="space-y-4">
              {items.sort((a,b) => a.order - b.order).map((item, index) => {
                  if (item.type === 'header') {
                      return (
                          <div key={item.id} className={cn("pt-4", index > 0 && "mt-6 border-t")}>
                              <h3 className="font-headline font-semibold text-lg text-primary">{item.description}</h3>
                          </div>
                      )
                  }
                  return (
                      <div key={item.id} className="text-sm p-3 -mx-3 rounded-lg flex items-start gap-4 transition-colors hover:bg-gray-50">
                          {item.type === 'item' ? (
                            item.isCompleted ? <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" /> : <XCircle className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                          ) : item.answer === 'yes' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                          ) : item.answer === 'no' ? (
                            <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                          ) : (
                            <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                          )}
                          <div className='flex-1'>
                              <p className={cn(item.type === 'item' && item.isCompleted && 'text-gray-500 line-through')}>
                                  {item.description}
                              </p>
                              {item.comment && (
                                  <div className='flex items-start gap-2 text-gray-600 mt-1.5'>
                                      <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                                      <p className='italic text-xs'>"{item.comment}"</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  )
              })}
              {items.length === 0 && (
                <div className="p-8 text-center text-gray-500">Nenhum item neste checklist.</div>
              )}
            </section>

            <footer className="mt-12 border-t border-gray-300 pt-4 text-center text-xs text-gray-400">
               BMV Global | Documento confidencial de uso interno
            </footer>
        </div>
      </main>
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

'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import type { Checklist, ChecklistItem, Team, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, Check, X, MessageSquare, CheckSquare, Heading2 } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export default function ChecklistReportPage() {
  const params = useParams();
  const firestore = useFirestore();
  const checklistId = params.checklistId as string;

  const checklistRef = useMemoFirebase(() => (firestore && checklistId ? doc(firestore, 'checklists', checklistId) : null), [firestore, checklistId]);
  const { data: checklist, isLoading: isLoadingChecklist } = useDoc<Checklist>(checklistRef);

  const itemsRef = useMemoFirebase(() => (firestore && checklistId ? query(collection(firestore, `checklists/${checklistId}/items`), orderBy('order')) : null), [firestore, checklistId]);
  const { data: items, isLoading: isLoadingItems } = useCollection<ChecklistItem>(itemsRef);
  
  const teamId = checklist?.teamId;
  const teamRef = useMemoFirebase(() => (firestore && teamId ? doc(firestore, 'teams', teamId) : null), [firestore, teamId]);
  const { data: team, isLoading: isLoadingTeam } = useDoc<Team>(teamRef);

  const isLoading = isLoadingChecklist || isLoadingItems || isLoadingTeam;

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

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  
  const completableItems = items.filter(item => item.type === 'item' || item.type === 'yes_no');
  const completedItems = completableItems.filter(item => (item.type === 'item' && item.isCompleted) || (item.type === 'yes_no' && item.answer !== 'unanswered')).length;
  const progress = completableItems.length > 0 ? (completedItems / completableItems.length) * 100 : 0;


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 print:bg-white print:p-0">
        <div className="fixed top-4 right-4 print:hidden">
            <Button onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir / Salvar PDF
            </Button>
        </div>
      <div className="mx-auto max-w-4xl bg-white p-12 shadow-lg print:shadow-none">
        <header className="flex items-center justify-between border-b pb-6">
            <div className="flex items-center gap-4">
                <Image src="/image/BMV.png" alt="BMV Logo" width={150} height={50} />
            </div>
            <div className="text-right">
                <h1 className="text-2xl font-bold text-gray-800">Relatório de Checklist</h1>
                <p className="text-sm text-gray-500">Data de Emissão: {today}</p>
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
                <h3 className="text-lg font-semibold text-gray-800">Itens do Checklist</h3>
                {items.map(item => {
                    if (item.type === 'header') {
                        return (
                            <div key={item.id} className="pt-4 pb-2 border-b">
                                <h4 className="font-bold text-base text-gray-700 flex items-center gap-2">
                                    <Heading2 className='h-4 w-4'/>
                                    {item.description}
                                </h4>
                            </div>
                        )
                    }
                    if (item.type === 'item') {
                        return (
                             <div key={item.id} className="flex items-center gap-3 text-sm">
                                <CheckSquare className={cn("h-5 w-5", item.isCompleted ? 'text-green-600' : 'text-gray-400')} />
                                <p className={cn(item.isCompleted && 'line-through text-gray-500')}>{item.description}</p>
                            </div>
                        )
                    }
                    if (item.type === 'yes_no') {
                        return (
                            <div key={item.id} className="space-y-1 text-sm">
                                <div className='flex items-center gap-3'>
                                   {item.answer === 'yes' && <Check className='h-5 w-5 text-green-600'/>}
                                   {item.answer === 'no' && <X className='h-5 w-5 text-red-600'/>}
                                   {item.answer === 'unanswered' && <div className="h-5 w-5 border-2 rounded-sm border-gray-400" />}
                                   <p>{item.description}</p>
                                </div>
                                {item.comment && (
                                     <div className='pl-8 flex items-start gap-2 text-gray-600'>
                                        <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                                        <p className='italic'>"{item.comment}"</p>
                                     </div>
                                )}
                            </div>
                        )
                    }
                    return null;
                })}
            </section>
        </main>

        <footer className="mt-24">
            <div className="flex justify-between items-center text-center">
                <div className="flex-1">
                    <div className="mx-auto h-px w-4/5 bg-gray-400"></div>
                    <p className="mt-2 text-sm">Assinatura do Responsável</p>
                </div>
            </div>
        </footer>

      </div>
    </div>
  );
}

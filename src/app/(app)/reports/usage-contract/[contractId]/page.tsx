
'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import Image from 'next/image';
import { ptBR } from 'date-fns/locale';

export default function UsageContractReportPage() {
  const params = useParams();
  const contractId = params?.contractId as string;
  const firestore = useFirestore();

  const contractDocQuery = useMemoFirebase(() => firestore && contractId ? doc(firestore, 'assetUsageContracts', contractId) : null, [firestore, contractId]);
  const { data: contract, isLoading: isLoadingContract } = useDoc<any>(contractDocQuery);

  const userDocQuery = useMemoFirebase(() => firestore && contract?.userId ? doc(firestore, 'users', contract.userId) : null, [firestore, contract?.userId]);
  const { data: user, isLoading: isLoadingUser } = useDoc<User>(userDocQuery);

  const isLoading = isLoadingContract || isLoadingUser;
  
  if (isLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-96 w-full" /></div>;
  }
  
  if (!contract) {
    return <div className="p-8"><p className="text-muted-foreground">Contrato não encontrado.</p></div>;
  }

  const start = contract.startDate ? format(new Date(contract.startDate), 'dd/MM/yyyy', { locale: ptBR }) : '—';
  const end = contract.endDate ? format(new Date(contract.endDate), 'dd/MM/yyyy', { locale: ptBR }) : '(Indeterminado)';

  return (
    <div className="space-y-4 bg-gray-100 min-h-screen">
      <header className="bg-gray-100 p-4 print:hidden flex items-center justify-between sticky top-0 z-20">
        <h2 className='font-headline text-lg'>Preview: Contrato de Uso</h2>
        <Button onClick={() => window.print()}>Imprimir ou Salvar como PDF</Button>
      </header>
      
      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-4xl bg-white p-12 shadow-lg print:shadow-none A4-container font-sans">
          <header className="flex items-start justify-between border-b border-gray-300 pb-6">
            <Image src="/image/BMV.png" alt="SGI Logo" width={150} height={43} />
            <div className="text-right">
              <h1 className="font-headline text-3xl font-bold text-gray-800">Contrato de Uso de Equipamento</h1>
              <p className="text-sm text-gray-500">Contrato Nº: {contract.id.substring(0, 8).toUpperCase()}</p>
            </div>
          </header>

          <section className="mt-8 space-y-6 text-gray-800">
            <div className="space-y-4 rounded-lg border bg-gray-50 p-6">
              <div>
                  <h2 className="font-headline font-semibold text-lg text-gray-700">Partes Envolvidas</h2>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <p><strong>Concedente:</strong> SGI</p>
                      <p><strong>Responsável:</strong> {user?.name || contract.userId}</p>
                      <p><strong>CNPJ:</strong> XX.XXX.XXX/0001-XX</p>
                      <p><strong>CPF:</strong> {user?.personalDocument || 'Não informado'}</p>
                  </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border bg-gray-50 p-6">
              <h2 className="font-headline font-semibold text-lg text-gray-700">Objeto do Contrato</h2>
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <p><strong>Equipamento:</strong> {contract.assetName}</p>
                <p><strong>Período:</strong> {start} a {end}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-headline font-semibold text-lg text-gray-700">Cláusulas e Condições</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{contract.clauses}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h3 className="font-headline font-semibold mb-2">Checklist de Entrega</h3>
                <ul className="list-disc list-inside space-y-1">
                  {(contract.checklistEntrega || []).map((item: string, i: number) => (
                    <li key={`entrega-${i}`}>{item}</li>
                  ))}
                  {(contract.checklistEntrega?.length || 0) === 0 && <li className="text-muted-foreground">Nenhum item.</li>}
                </ul>
              </div>
              <div>
                <h3 className="font-headline font-semibold mb-2">Checklist de Devolução</h3>
                <ul className="list-disc list-inside space-y-1">
                  {(contract.checklistDevolucao || []).map((item: string, i: number) => (
                    <li key={`devolucao-${i}`}>{item}</li>
                  ))}
                  {(contract.checklistDevolucao?.length || 0) === 0 && <li className="text-muted-foreground">Nenhum item.</li>}
                </ul>
              </div>
            </div>

            {contract.observations && (
               <div className="space-y-2">
                <h3 className="font-headline font-semibold text-lg text-gray-700">Observações</h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{contract.observations}</p>
              </div>
            )}

            <div className="pt-24 text-center text-sm space-y-12">
              <div className="grid grid-cols-2 gap-12">
                 <div>
                    <div className="h-12 border-b border-gray-400" />
                    <p className="mt-2"><strong>{user?.name || '________________'}</strong></p>
                    <p className="text-xs text-gray-500">RESPONSÁVEL</p>
                 </div>
                 <div>
                    <div className="h-12 border-b border-gray-400" />
                     <p className="mt-2"><strong>Representante da SGI</strong></p>
                    <p className="text-xs text-gray-500">CONCEDENTE</p>
                 </div>
              </div>
            </div>
          </section>

          <footer className="mt-12 border-t border-gray-300 pt-4 text-center text-xs text-gray-400">
             SGI | Documento confidencial de uso interno
          </footer>
        </div>
      </main>
    </div>
  );
}

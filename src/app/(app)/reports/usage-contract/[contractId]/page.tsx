'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function UsageContractReportPage() {
  const params = useParams();
  const contractId = params?.contractId as string;
  const firestore = useFirestore();

  const contractDocQuery = useMemoFirebase(() => firestore && contractId ? doc(firestore, 'assetUsageContracts', contractId) : null, [firestore, contractId]);
  const { data: contractArr, isLoading: isLoadingContract } = useCollection<any>(contractDocQuery as any);
  const contract = contractArr?.[0];

  const userDocQuery = useMemoFirebase(() => firestore && contract?.userId ? doc(firestore, 'users', contract.userId) : null, [firestore, contract?.userId]);
  const { data: userArr } = useCollection<User>(userDocQuery as any);
  const user = userArr?.[0];

  if (isLoadingContract) return <Skeleton className="h-[400px]"/>;
  if (!contract) return <p className="text-muted-foreground">Contrato não encontrado.</p>;

  const start = contract.startDate ? format(new Date(contract.startDate), 'dd/MM/yyyy') : '—';
  const end = contract.endDate ? format(new Date(contract.endDate), 'dd/MM/yyyy') : '—';

  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <Button onClick={() => window.print()}>Imprimir</Button>
      </div>
      <Card className="shadow-none border print:border-0">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Contrato de Uso de Equipamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="text-sm leading-6">
            <p><strong>Equipamento:</strong> {contract.assetName}</p>
            <p><strong>Usuário Responsável:</strong> {user?.name || contract.userId}</p>
            <p><strong>Período:</strong> {start} a {end}</p>
          </section>

          <section className="text-sm leading-6">
            <h2 className="font-semibold mb-2">Cláusulas</h2>
            <p className="whitespace-pre-wrap">{contract.clauses}</p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Checklist de Entrega</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(contract.checklistEntrega || []).map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Checklist de Devolução</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(contract.checklistDevolucao || []).map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-16">
            <div className="text-center">
              <div className="h-16"/>
              <p className="border-t pt-2">Assinatura do Usuário</p>
            </div>
            <div className="text-center">
              <div className="h-16"/>
              <p className="border-t pt-2">Assinatura do Gestor</p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

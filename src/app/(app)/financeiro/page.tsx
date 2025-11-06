'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser as useAuthUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Reimbursement, Role, User } from '@/lib/types';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HandCoins, CheckCircle2, XCircle, Clock } from 'lucide-react';
import dynamic from 'next/dynamic';

const ReembolsoDataTable = dynamic(() => import('@/components/reembolsos/reembolso-data-table').then(m => m.ReembolsoDataTable), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px]" />,
});

export default function FinanceiroPage() {
  const firestore = useFirestore();
  const { user: authUser } = useAuthUser();

  const userProfileQuery = useMemoFirebase(() => firestore && authUser ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: userProfile, isLoading: isLoadingProfile } = useCollection<User>(userProfileQuery as any);
  const roleId = userProfile?.[0]?.roleId;

  const roleQuery = useMemoFirebase(() => firestore && roleId ? doc(firestore, 'roles', roleId) : null, [firestore, roleId]);
  const { data: roleData, isLoading: isLoadingRole } = useCollection<Role>(roleQuery as any);
  const isManager = roleData?.[0]?.isManager;

  const reimbursementsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'reimbursements') : null, [firestore]);
  const { data: reimbursements, isLoading: isLoadingReimb } = useCollection<Reimbursement>(reimbursementsQuery);

  const { pendingCount, approvedCount, rejectedCount, pendingAmount } = useMemo(() => {
    const items = reimbursements || [];
    const pend = items.filter(r => r.status === 'Pendente');
    const appr = items.filter(r => r.status === 'Aprovado');
    const rej = items.filter(r => r.status === 'Recusado');
    const pendAmt = pend.reduce((sum, r) => sum + (r.amount || 0), 0);
    return {
      pendingCount: pend.length,
      approvedCount: appr.length,
      rejectedCount: rej.length,
      pendingAmount: pendAmt,
    };
  }, [reimbursements]);

  const isLoading = isLoadingProfile || isLoadingRole || isLoadingReimb;

  if (!authUser) return null;

  if (!isLoading && !isManager) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Este painel é restrito a gestores.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Painel Financeiro</h1>
        <p className="text-muted-foreground">Acompanhe e aprove solicitações de reembolso.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <KpiCard
              title="Pendentes"
              value={pendingCount.toString()}
              description="Reembolsos aguardando decisão"
              icon={<Clock className="text-amber-500" />}
            />
            <KpiCard
              title="Aprovados"
              value={approvedCount.toString()}
              description="Reembolsos aprovados"
              icon={<CheckCircle2 className="text-green-600" />}
            />
            <KpiCard
              title="Recusados"
              value={rejectedCount.toString()}
              description="Reembolsos recusados"
              icon={<XCircle className="text-red-600" />}
            />
            <KpiCard
              title="Valor Pendente"
              value={`R$ ${pendingAmount.toFixed(2)}`}
              description="Total aguardando aprovação"
              icon={<HandCoins className="text-primary" />}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ReembolsoDataTable />
      </div>
    </div>
  );
}

'use client';

import { useUser } from '@/firebase';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ReembolsoDataTable = dynamic(() => import('@/components/reembolsos/reembolso-data-table').then(m => m.ReembolsoDataTable), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px]" />,
});

export default function MeusReembolsosPage() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) return null;
  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Meus Reembolsos</h1>
        <p className="text-muted-foreground">Abra novas solicitações e acompanhe o status dos seus reembolsos.</p>
      </header>
      <ReembolsoDataTable filterUserId={user.uid} />
    </div>
  );
}

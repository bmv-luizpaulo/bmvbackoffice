'use client';

import { useDoc, useMemoFirebase, useFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { User as UserType, Role } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useFirestore } from "@/firebase";

const ManagerDashboard = dynamic(() => import('@/components/dashboard/manager-dashboard'), {
  loading: () => <DashboardSkeleton />,
});

const UserDashboard = dynamic(() => import('@/components/dashboard/user-dashboard'), {
    loading: () => <DashboardSkeleton />,
});

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <header>
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
            </header>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-[350px]" />
                    <Skeleton className="h-[300px]" />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <Skeleton className="h-[400px]" />
                    <Skeleton className="h-[400px]" />
                </div>
            </div>
        </div>
    );
}


function DashboardPage() {
  const { user: authUser, isUserLoading, claims, areClaimsReady } = useFirebase();

  // isLoading é verdadeiro se o usuário ainda não foi autenticado
  // ou se as permissões (claims) ainda não estão prontas.
  const isLoading = isUserLoading || !areClaimsReady;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // A partir daqui, temos certeza que as claims estão carregadas.
  const isManager = claims?.isManager || claims?.isDev;

  return (
    <Suspense fallback={<DashboardSkeleton />}>
        {isManager ? (
          <ManagerDashboard />
        ) : authUser ? (
          <UserDashboard user={authUser as any} />
        ) : (
          // Caso de fallback se o usuário não for gestor e o objeto de usuário não estiver disponível
          <DashboardSkeleton />
        )}
    </Suspense>
  );
}

export default DashboardPage;

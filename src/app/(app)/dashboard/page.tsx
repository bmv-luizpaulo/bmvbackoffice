
'use client';

import { useFirebase, useUser as useAuthUser } from "@/firebase";
import { Skeleton } from '@/components/ui/skeleton';
import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

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

  if (isUserLoading || !areClaimsReady) {
    return <DashboardSkeleton />;
  }

  const isManager = claims?.isManager || claims?.isDev;

  return (
    <Suspense fallback={<DashboardSkeleton />}>
        {isManager ? (
            <ManagerDashboard />
        ) : (
            <UserDashboard user={authUser!} />
        )}
    </Suspense>
  );
}

export default DashboardPage;

    
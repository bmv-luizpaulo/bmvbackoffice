'use client';

import { useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import type { User as UserType, Role } from '@/lib/types';
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
  const firestore = useFirestore();
  const { user: authUser, isUserLoading } = useUser();
  
  const userProfileQuery = useMemoFirebase(() => firestore && authUser?.uid ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser?.uid]);
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserType>(userProfileQuery);
  
  const roleQuery = useMemoFirebase(() => firestore && userProfile?.roleId ? doc(firestore, 'roles', userProfile.roleId) : null, [firestore, userProfile?.roleId]);
  const { data: role, isLoading: isLoadingRole } = useDoc<Role>(roleQuery);

  const isLoading = isUserLoading || isLoadingProfile || isLoadingRole;
  
  if (isLoading) {
    return <DashboardSkeleton />;
  }
  
  const isManager = role?.isManager || role?.isDev;

  return (
    <Suspense fallback={<DashboardSkeleton />}>
        {isManager ? (
          <ManagerDashboard /> 
        ) : userProfile ? (
          <UserDashboard user={userProfile} /> 
        ) : (
          <DashboardSkeleton />
        )}
    </Suspense>
  );
}

export default DashboardPage;

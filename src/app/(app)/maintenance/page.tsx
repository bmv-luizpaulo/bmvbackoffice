'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const MaintenanceDataTable = dynamic(() => import('@/components/maintenance/maintenance-data-table').then(m => m.MaintenanceDataTable), { ssr: false });

export default function MaintenancePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <Wrench className="h-8 w-8 text-primary" />
          Manutenção de Ativos
        </h1>
        <p className="text-muted-foreground">
          Acompanhe e agende as manutenções dos ativos da empresa.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos de Manutenção</CardTitle>
          <CardDescription>
            Agende, visualize e gerencie o histórico de manutenções de todos os ativos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-full" />
                <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                </div>
            </div>
          }>
            <MaintenanceDataTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

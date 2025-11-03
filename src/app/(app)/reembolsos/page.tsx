'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HandCoins } from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ReembolsoDataTable = dynamic(() => import('@/components/reembolsos/reembolso-data-table').then(m => m.ReembolsoDataTable), { ssr: false });

export default function ReembolsosPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <HandCoins className="h-8 w-8 text-primary" />
          Gestão de Reembolsos
        </h1>
        <p className="text-muted-foreground">
          Solicite, aprove ou recuse reembolsos da equipe.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Solicitações de Reembolso</CardTitle>
          <CardDescription>
            Acompanhe o status de todas as solicitações de reembolso.
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
            <ReembolsoDataTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

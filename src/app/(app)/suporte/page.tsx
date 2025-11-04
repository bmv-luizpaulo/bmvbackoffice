'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LifeBuoy } from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const TicketDataTable = dynamic(() => import('@/components/suporte/ticket-data-table').then(m => m.TicketDataTable), { ssr: false });

export default function SuportePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <LifeBuoy className="h-8 w-8 text-primary" />
          Central de Suporte
        </h1>
        <p className="text-muted-foreground">
          Abra e acompanhe seus chamados de suporte técnico e operacional.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Meus Chamados</CardTitle>
          <CardDescription>
            Acompanhe o status de todas as suas solicitações de suporte.
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
            <TicketDataTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

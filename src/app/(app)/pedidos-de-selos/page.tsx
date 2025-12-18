
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const SealOrderDataTable = dynamic(() => import('@/components/selos/seal-order-data-table').then(m => m.SealOrderDataTable), { ssr: false });

export default function SealOrdersPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <Award className="h-8 w-8 text-primary" />
          Pedidos de Selos (Legado)
        </h1>
        <p className="text-muted-foreground">
          Consulte e gerencie os pedidos de selos do sistema antigo.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pedidos</CardTitle>
          <CardDescription>
            Visualize os pedidos de selos importados do sistema legado.
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
            <SealOrderDataTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet } from "lucide-react";

const CostCenterDataTable = dynamic(() => import("@/components/cost-centers/cost-center-data-table").then(m => m.CostCenterDataTable), { ssr: false });

export default function CostCentersPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-8 w-8 text-primary"/>
            Centro de Custos
        </h1>
        <p className="text-muted-foreground">
          Gerencie os centros de custo para rastreamento financeiro.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Centros de Custo</CardTitle>
          <CardDescription>
            Crie e organize os centros de custo da sua empresa.
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
            <CostCenterDataTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

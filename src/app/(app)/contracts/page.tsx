'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive } from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ContractDataTable = dynamic(() => import('@/components/contracts/contract-data-table').then(m => m.ContractDataTable), { ssr: false });

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <Archive className="h-8 w-8 text-primary" />
          Contratos e Documentos
        </h1>
        <p className="text-muted-foreground">
          Centralize a gestão de contratos e documentos importantes.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Contratos</CardTitle>
          <CardDescription>
            Adicione, edite e visualize todos os contratos da empresa.
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
            <ContractDataTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

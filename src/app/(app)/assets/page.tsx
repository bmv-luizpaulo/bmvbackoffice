'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import NextDynamic from "next/dynamic";
import { Suspense } from 'react';
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = 'force-dynamic';

const AssetDataTable = NextDynamic(() => import("@/components/assets/asset-data-table").then(m => m.AssetDataTable));

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-8 w-8 text-primary" />
          Inventário de Ativos
        </h1>
        <p className="text-muted-foreground">
          Gerencie os ativos físicos e digitais da sua organização.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Inventário de Ativos</CardTitle>
          <CardDescription>
            Adicione, edite e visualize todos os ativos da empresa.
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
                <AssetDataTable />
            </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

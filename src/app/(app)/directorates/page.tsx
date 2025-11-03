'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Building } from "lucide-react";

const DirectorateDataTable = dynamic(() => import("@/components/teams/directorate-data-table").then(m => m.DirectorateDataTable));

export default function DirectoratesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building className="h-8 w-8 text-primary"/>
            Diretorias
        </h1>
        <p className="text-muted-foreground">
          Gerencie as diretorias ou divisões da sua organização.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Diretorias</CardTitle>
          <CardDescription>
            Crie e organize as diretorias que compõem sua empresa.
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
            <DirectorateDataTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

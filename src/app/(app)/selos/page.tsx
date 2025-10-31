'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from 'next/dynamic';
import * as React from 'react';
import { Award } from 'lucide-react';

const SealDataTable = dynamic(() => import("@/components/selos/seal-data-table").then(m => m.SealDataTable), { ssr: false });

export default function SelosPage() {

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <Award className="h-8 w-8 text-primary" />
          Gestão de Selos
        </h1>
        <p className="text-muted-foreground">
          Acompanhe a emissão, validade e renovação dos selos de certificação.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Monitoramento de Selos</CardTitle>
          <CardDescription>Visualize e gerencie todos os selos emitidos para seus clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <SealDataTable />
        </CardContent>
      </Card>
    </div>
  );
}

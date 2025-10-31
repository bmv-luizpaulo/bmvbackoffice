'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import * as React from 'react';

export default function ReportsPage() {

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          Relatórios
        </h1>
        <p className="text-muted-foreground">
          Gere e visualize relatórios importantes para a gestão.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Em Construção</CardTitle>
          <CardDescription>
            Esta área está sendo desenvolvida e estará disponível em breve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
            <p className="text-lg font-semibold">Central de Relatórios</p>
            <p className="text-muted-foreground mt-2">
                Em breve, você poderá gerar termos de entrega, devolução, notas promissórias e outros relatórios importantes por aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

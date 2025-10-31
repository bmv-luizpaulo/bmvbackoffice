'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import * as React from 'react';

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
          <CardTitle>Em Construção</CardTitle>
          <CardDescription>
            Esta área está sendo desenvolvida e estará disponível em breve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
            <p className="text-lg font-semibold">Página de Manutenções</p>
            <p className="text-muted-foreground mt-2">
                Aqui você poderá agendar, visualizar e registrar o histórico de manutenções de todos os ativos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

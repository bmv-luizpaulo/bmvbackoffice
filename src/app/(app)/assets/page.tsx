// THIS IS A NEW FILE
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-8 w-8 text-primary" />
          Gestão de Ativos
        </h1>
        <p className="text-muted-foreground">
          Gerencie os ativos físicos e digitais da sua organização.
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
            <p className="text-lg font-semibold">Página de Ativos</p>
            <p className="text-muted-foreground mt-2">
                Aqui você poderá cadastrar, rastrear e gerenciar o ciclo de vida dos ativos da empresa, desde equipamentos a licenças de software.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

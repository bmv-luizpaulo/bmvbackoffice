// THIS IS A NEW FILE
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive } from "lucide-react";

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
          <CardTitle>Em Construção</CardTitle>
          <CardDescription>
            Esta área está sendo desenvolvida e estará disponível em breve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
            <p className="text-lg font-semibold">Página de Contratos</p>
            <p className="text-muted-foreground mt-2">
                Aqui você poderá fazer upload, versionar, e controlar as datas de vencimento de todos os seus contratos e documentos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

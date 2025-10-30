// THIS IS A NEW FILE
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks } from "lucide-react";

export default function ChecklistsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <ListChecks className="h-8 w-8 text-primary" />
          Checklists
        </h1>
        <p className="text-muted-foreground">
          Crie e gerencie checklists padronizados para seus processos.
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
            <p className="text-lg font-semibold">Página de Checklists</p>
            <p className="text-muted-foreground mt-2">
                Aqui você poderá criar modelos de checklists para processos recorrentes, garantindo a padronização e a qualidade das entregas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

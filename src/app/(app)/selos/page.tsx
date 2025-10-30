'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";

export default function SelosPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <Award className="h-8 w-8 text-primary" />
          Selos e Certificações
        </h1>
        <p className="text-muted-foreground">
          Gerencie os selos e certificações para projetos e clientes.
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
            <p className="text-lg font-semibold">Página de Selos</p>
            <p className="text-muted-foreground mt-2">
                Aqui você poderá criar, atribuir e visualizar os selos de qualidade, conclusão e outras certificações.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

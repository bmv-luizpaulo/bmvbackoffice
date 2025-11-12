'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";

const RoleDataTable = dynamic(() => import("@/components/teams/role-data-table").then(m => m.RoleDataTable));

export default function PerfisPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary"/>
            Gestão de Perfis de Acesso
        </h1>
        <p className="text-muted-foreground">
          Defina os perfis, cargos e as permissões dos usuários no sistema.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Perfis e Cargos</CardTitle>
          <CardDescription>
            Defina os cargos, responsabilidades e permissões de acesso.
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
            <RoleDataTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

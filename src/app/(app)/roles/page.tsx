'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase } from "lucide-react";

const RoleDataTable = dynamic(() => import("@/components/teams/role-data-table").then(m => m.RoleDataTable));

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-primary"/>
            Cargos
        </h1>
        <p className="text-muted-foreground">
          Defina os cargos e as permissões dos usuários no sistema.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Cargos</CardTitle>
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

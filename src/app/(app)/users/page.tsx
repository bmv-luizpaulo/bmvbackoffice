'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "lucide-react";

const UserDataTable = dynamic(() => import("@/components/teams/user-data-table").then(m => m.UserDataTable));

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
            <User className="h-8 w-8 text-primary"/>
            Usuários
        </h1>
        <p className="text-muted-foreground">
          Gerencie os membros da sua equipe.
        </p>
      </header>
        <Card>
        <CardHeader>
            <CardTitle>Gerenciamento de Usuários</CardTitle>
            <CardDescription>
            Adicione, edite e organize os membros da sua equipe.
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
            <UserDataTable />
            </Suspense>
        </CardContent>
        </Card>
    </div>
  );
}

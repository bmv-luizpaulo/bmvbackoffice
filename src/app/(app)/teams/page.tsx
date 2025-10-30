import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const UserDataTable = dynamic(() => import("@/components/teams/user-data-table").then(m => m.UserDataTable));
const TeamDataTable = dynamic(() => import("@/components/teams/team-data-table").then(m => m.TeamDataTable));

export default function TeamsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Usuários & Equipes</h1>
        <p className="text-muted-foreground">
          Gerencie suas equipes, gestores, usuários e grupos.
        </p>
      </header>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="teams">Núcleos</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
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
        </TabsContent>

        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Núcleos</CardTitle>
              <CardDescription>
                Crie e gerencie os núcleos (equipes) da sua organização.
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
                <TeamDataTable />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

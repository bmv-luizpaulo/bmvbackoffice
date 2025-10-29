import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserDataTable } from "@/components/teams/user-data-table";
import { TeamDataTable } from "@/components/teams/team-data-table";
import { Separator } from "@/components/ui/separator";

export default function TeamsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Equipes</h1>
        <p className="text-muted-foreground">
          Gerencie suas equipes, gestores, funcionários e grupos.
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
          <UserDataTable />
        </CardContent>
      </Card>
      
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Núcleos</CardTitle>
          <CardDescription>
            Crie e gerencie os núcleos (equipes) da sua organização.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamDataTable />
        </CardContent>
      </Card>
    </div>
  );
}

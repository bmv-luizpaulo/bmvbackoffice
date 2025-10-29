import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie sua conta e as preferências do aplicativo.
        </p>
      </header>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Este é um espaço reservado para as configurações do perfil.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>As informações do perfil do usuário serão exibidas e editáveis aqui.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Notificações</CardTitle>
          <CardDescription>Este é um espaço reservado para as configurações de notificação.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>As preferências de notificação do usuário serão configuradas aqui.</p>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>Tema</CardTitle>
          <CardDescription>Este é um espaço reservado para as configurações do tema.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Modo claro/escuro e outras opções de tema estarão disponíveis aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { ThemeSettings } from "@/components/settings/theme-settings";
import { PasswordSettings } from "@/components/settings/password-settings";
import { useUser } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
       <div className="space-y-6">
        <header>
            <h1 className="font-headline text-3xl font-bold tracking-tight">Configurações</h1>
            <p className="text-muted-foreground">
            Gerencie sua conta e as preferências do aplicativo.
            </p>
        </header>
        <Separator />
        <div className="space-y-6">
            <Skeleton className="w-full h-64" />
            <Skeleton className="w-full h-48" />
            <Skeleton className="w-full h-48" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
        <div className="space-y-6">
            <h1 className="font-headline text-3xl font-bold tracking-tight">Configurações</h1>
            <p>Você precisa estar logado para acessar as configurações.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie sua conta e as preferências do aplicativo.
        </p>
      </header>
      
      <Separator />

      <ProfileSettings user={user} />

      <ThemeSettings />

      <PasswordSettings />

    </div>
  );
}

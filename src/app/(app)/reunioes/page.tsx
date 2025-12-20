'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Calendar } from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const MeetingsDataTable = dynamic(() => import('@/components/meetings/meetings-data-table').then(m => m.MeetingsDataTable), { ssr: false });

export default function ReunioesPage() {
  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
            <Video className="h-8 w-8 text-primary" />
            Reuniões
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas reuniões, agende novas e veja o histórico.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/agenda/tarefas">
            <Calendar className="h-4 w-4 mr-2"/>
            Ver Agenda Completa
          </Link>
        </Button>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Reuniões</CardTitle>
          <CardDescription>
            Adicione, edite e visualize todas as reuniões agendadas.
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
            <MeetingsDataTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

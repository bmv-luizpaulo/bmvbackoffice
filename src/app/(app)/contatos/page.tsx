'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';
import * as React from 'react';

const ContactDataTable = dynamic(() => import("@/components/agenda/contact-data-table").then(m => m.ContactDataTable), {
  ssr: false,
});

export default function ContatosPage() {
  const [tab, setTab] = React.useState<'clientes' | 'fornecedores' | 'parceiros'>('clientes');
  const [isPending, startTransition] = (React as any).useTransition ? (React as any).useTransition() : [false, (fn: any) => fn()];

  const header = React.useMemo(() => {
    if (tab === 'clientes') return { title: 'Clientes', desc: 'Adicione, edite e visualize os clientes da sua empresa.' };
    if (tab === 'fornecedores') return { title: 'Fornecedores', desc: 'Gerencie as informações dos seus fornecedores.' };
    return { title: 'Parceiros', desc: 'Gerencie as informações dos seus parceiros.' };
  }, [tab]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Agenda de Contatos</h1>
        <p className="text-muted-foreground">
          Gerencie seus clientes, fornecedores e parceiros em um só lugar.
        </p>
      </header>
      <Tabs defaultValue="clientes" onValueChange={(v) => startTransition(() => setTab(v as any))}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="parceiros">Parceiros</TabsTrigger>
        </TabsList>
        <TabsContent value="clientes">
          <Card>
            <CardHeader>
              <CardTitle>Clientes</CardTitle>
              <CardDescription>Adicione, edite e visualize os clientes da sua empresa.</CardDescription>
            </CardHeader>
            <CardContent>
                <ContactDataTable key="clientes" type="cliente" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="fornecedores">
          <Card>
            <CardHeader>
              <CardTitle>Fornecedores</CardTitle>
              <CardDescription>Gerencie as informações dos seus fornecedores.</CardDescription>
            </CardHeader>
            <CardContent>
              <ContactDataTable key="fornecedores" type="fornecedor" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="parceiros">
          <Card>
            <CardHeader>
              <CardTitle>Parceiros</CardTitle>
              <CardDescription>Gerencie as informações dos seus parceiros.</CardDescription>
            </CardHeader>
            <CardContent>
              <ContactDataTable key="parceiros" type="parceiro" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

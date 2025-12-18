'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';
import * as React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Contact } from "@/lib/types";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Users, Building, Handshake } from "lucide-react";

const ContactDataTable = dynamic(() => import("@/components/agenda/contact-data-table").then(m => m.ContactDataTable), {
  ssr: false,
  loading: () => <ContactDataTableSkeleton />,
});

function ContactDataTableSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex justify-between">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="border rounded-md">
                <div className="space-y-2 p-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            </div>
        </div>
    )
}

function KpiSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
        </div>
    )
}

export default function ContatosPage() {
  const [tab, setTab] = React.useState<'clientes' | 'fornecedores' | 'parceiros'>('clientes');
  const [isPending, startTransition] = (React as any).useTransition ? (React as any).useTransition() : [false, (fn: any) => fn()];
  const firestore = useFirestore();

  const contactsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'contacts') : null, [firestore]);
  const { data: contacts, isLoading: isLoadingContacts } = useCollection<Contact>(contactsQuery);

  const { clientsCount, suppliersCount, partnersCount, activeCount } = React.useMemo(() => {
    if (!contacts) return { clientsCount: 0, suppliersCount: 0, partnersCount: 0, activeCount: 0 };
    return {
      clientsCount: contacts.filter(c => c.tipo === 'cliente').length,
      suppliersCount: contacts.filter(c => c.tipo === 'fornecedor').length,
      partnersCount: contacts.filter(c => c.tipo === 'parceiro').length,
      activeCount: contacts.filter(c => c.situacao === 'Ativo').length,
    };
  }, [contacts]);


  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Agenda de Contatos</h1>
        <p className="text-muted-foreground">
          Gerencie seus clientes, fornecedores e parceiros em um só lugar.
        </p>
      </header>

      {isLoadingContacts ? <KpiSkeleton /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard 
                title="Clientes"
                value={clientsCount.toString()}
                description="Total de clientes cadastrados"
                icon={<Users className="text-primary"/>}
            />
             <KpiCard 
                title="Fornecedores"
                value={suppliersCount.toString()}
                description="Total de fornecedores cadastrados"
                icon={<Building className="text-primary"/>}
            />
             <KpiCard 
                title="Parceiros"
                value={partnersCount.toString()}
                description="Total de parceiros cadastrados"
                icon={<Handshake className="text-primary"/>}
            />
             <KpiCard 
                title="Contatos Ativos"
                value={activeCount.toString()}
                description="Total de contatos com status 'Ativo'"
                icon={<Users className="text-green-500"/>}
            />
        </div>
      )}


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
                {tab === 'clientes' && <ContactDataTable key="clientes" type="cliente" />}
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
              {tab === 'fornecedores' && <ContactDataTable key="fornecedores" type="fornecedor" />}
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
              {tab === 'parceiros' && <ContactDataTable key="parceiros" type="parceiro" />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

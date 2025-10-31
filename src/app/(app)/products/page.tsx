'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';
import * as React from 'react';
import { Package } from 'lucide-react';

const ProductDataTable = dynamic(() => import("@/components/selos/product-data-table").then(m => m.ProductDataTable), { ssr: false });

export default function ProductsPage() {
  const [tab, setTab] = React.useState<'todos' | 'ativos' | 'inativos'>('todos');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          Produtos
        </h1>
        <p className="text-muted-foreground">
          Gerencie os produtos e serviços que sua empresa oferece, incluindo os que podem ser certificados com selos.
        </p>
      </header>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="todos">Todos os Produtos</TabsTrigger>
          <TabsTrigger value="ativos">Ativos</TabsTrigger>
          <TabsTrigger value="inativos">Inativos</TabsTrigger>
        </TabsList>
        <TabsContent value="todos">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Produtos</CardTitle>
              <CardDescription>Visualize todos os produtos cadastrados.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProductDataTable statusFilter="all" />
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="ativos">
          <Card>
            <CardHeader>
              <CardTitle>Produtos Ativos</CardTitle>
              <CardDescription>Produtos atualmente disponíveis ou em comercialização.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProductDataTable statusFilter="Ativo" />
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="inativos">
          <Card>
            <CardHeader>
              <CardTitle>Produtos Inativos</CardTitle>
              <CardDescription>Produtos que foram descontinuados ou não estão mais disponíveis.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProductDataTable statusFilter="Inativo" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

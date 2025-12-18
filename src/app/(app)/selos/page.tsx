
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from 'next/dynamic';
import * as React from 'react';
import { Award, Package, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const SealDataTable = dynamic(() => import("@/components/selos/seal-data-table").then(m => m.SealDataTable), { ssr: false });
const ProductDataTable = dynamic(() => import("@/components/selos/product-data-table").then(m => m.ProductDataTable), { ssr: false });
const SealOrderDataTable = dynamic(() => import('@/components/selos/seal-order-data-table').then(m => m.SealOrderDataTable), { ssr: false });


function DataTableSkeleton() {
  return (
    <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        </div>
    </div>
  );
}

export default function SelosPage() {

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <Award className="h-8 w-8 text-primary" />
          Selos & Produtos
        </h1>
        <p className="text-muted-foreground">
          Gerencie selos de certificação, produtos associados e pedidos legados.
        </p>
      </header>
       <Tabs defaultValue="selos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="selos">
            <Award className="mr-2 h-4 w-4"/>
            Gestão de Selos
          </TabsTrigger>
          <TabsTrigger value="produtos">
            <Package className="mr-2 h-4 w-4"/>
            Produtos
          </TabsTrigger>
          <TabsTrigger value="legado">
            <History className="mr-2 h-4 w-4"/>
            Pedidos Legados
          </TabsTrigger>
        </TabsList>
        <TabsContent value="selos">
            <Card>
                <CardHeader>
                <CardTitle>Monitoramento de Selos</CardTitle>
                <CardDescription>Visualize e gerencie todos os selos emitidos para seus clientes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<DataTableSkeleton />}>
                        <SealDataTable />
                    </Suspense>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="produtos">
            <Card>
                <CardHeader>
                <CardTitle>Todos os Produtos</CardTitle>
                <CardDescription>Visualize todos os produtos e serviços cadastrados.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<DataTableSkeleton />}>
                        <ProductDataTable statusFilter="all" />
                    </Suspense>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="legado">
            <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="active">Pedidos Ativos</TabsTrigger>
                    <TabsTrigger value="archived">Arquivados</TabsTrigger>
                </TabsList>
                 <TabsContent value="active">
                    <Card>
                        <CardHeader>
                        <CardTitle>Histórico de Pedidos Ativos</CardTitle>
                        <CardDescription>
                            Visualize os pedidos de selos importados do sistema legado que não estão arquivados.
                        </CardDescription>
                        </CardHeader>
                        <CardContent>
                        <Suspense fallback={<DataTableSkeleton />}>
                            <SealOrderDataTable statusFilter="active" />
                        </Suspense>
                        </CardContent>
                    </Card>
                 </TabsContent>
                  <TabsContent value="archived">
                    <Card>
                        <CardHeader>
                        <CardTitle>Pedidos Arquivados</CardTitle>
                        <CardDescription>
                            Visualize os pedidos de selos que foram marcados como arquivados.
                        </CardDescription>
                        </CardHeader>
                        <CardContent>
                        <Suspense fallback={<DataTableSkeleton />}>
                            <SealOrderDataTable statusFilter="archived" />
                        </Suspense>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

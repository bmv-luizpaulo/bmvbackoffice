'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';
import * as React from 'react';

const SealDataTable = dynamic(() => import("@/components/selos/seal-data-table").then(m => m.SealDataTable), { ssr: false });
const ProductDataTable = dynamic(() => import("@/components/selos/product-data-table").then(m => m.ProductDataTable), { ssr: false });

export default function SelosPage() {
  const [tab, setTab] = React.useState<'seals' | 'products'>('seals');
  const [isPending, startTransition] = (React as any).useTransition ? (React as any).useTransition() : [false, (fn: any) => fn()];

  const header = React.useMemo(() => {
    if (tab === 'seals') return { title: 'Monitoramento de Selos', desc: 'Acompanhe a emissão, validade e renovação dos selos.' };
    return { title: 'Cadastro de Produtos', desc: 'Adicione e gerencie os produtos que podem receber certificação.' };
  }, [tab]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Selos e Produtos</h1>
        <p className="text-muted-foreground">
          Gerencie os selos de certificação e os produtos cadastrados.
        </p>
      </header>
      <Tabs value={tab} onValueChange={(v) => startTransition(() => setTab(v as any))}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="seals">Gestão de Selos</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <Card>
            <CardHeader>
              <CardTitle>{header.title}</CardTitle>
              <CardDescription>{header.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              {isPending ? (
                <div className="py-10 text-center text-muted-foreground">Carregando...</div>
              ) : (
                tab === 'seals' ? <SealDataTable key={tab} /> : <ProductDataTable key={tab} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SealDataTable } from "@/components/selos/seal-data-table";
import { ProductDataTable } from "@/components/selos/product-data-table";

export default function SelosPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Selos e Produtos</h1>
        <p className="text-muted-foreground">
          Gerencie os selos de certificação e os produtos cadastrados.
        </p>
      </header>
      <Tabs defaultValue="seals">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="seals">Gestão de Selos</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
        </TabsList>
        <TabsContent value="seals">
            <Card>
                <CardHeader>
                    <CardTitle>Monitoramento de Selos</CardTitle>
                    <CardDescription>Acompanhe a emissão, validade e renovação dos selos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <SealDataTable />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="products">
             <Card>
                <CardHeader>
                    <CardTitle>Cadastro de Produtos</CardTitle>
                    <CardDescription>Adicione e gerencie os produtos que podem receber certificação.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ProductDataTable />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

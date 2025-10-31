'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from 'next/dynamic';
import * as React from 'react';
import { Package } from 'lucide-react';

const ProductDataTable = dynamic(() => import("@/components/selos/product-data-table").then(m => m.ProductDataTable), { ssr: false });

export default function ProductsPage() {

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          Produtos
        </h1>
        <p className="text-muted-foreground">
          Gerencie os produtos que podem ser associados a um selo de certificação.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Cadastro de Produtos</CardTitle>
          <CardDescription>Adicione e gerencie os produtos que podem receber certificação.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductDataTable />
        </CardContent>
      </Card>
    </div>
  );
}

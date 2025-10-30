'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactDataTable } from "@/components/agenda/contact-data-table";

export default function ContatosPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Agenda de Contatos</h1>
        <p className="text-muted-foreground">
          Gerencie seus clientes, fornecedores e parceiros em um só lugar.
        </p>
      </header>
      <Tabs defaultValue="clientes">
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
                    <ContactDataTable type="cliente" />
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
                    <ContactDataTable type="fornecedor" />
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
                    <ContactDataTable type="parceiro" />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

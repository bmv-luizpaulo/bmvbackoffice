// This is a new file: src/app/(app)/agenda/page.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactDataTable } from "@/components/agenda/contact-data-table";
import { EmployeeList } from "@/components/agenda/employee-list";

export default function AgendaPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Agenda de Contatos</h1>
        <p className="text-muted-foreground">
          Gerencie seus clientes, fornecedores, parceiros e funcionários em um só lugar.
        </p>
      </header>
      <Tabs defaultValue="clientes">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="parceiros">Parceiros</TabsTrigger>
          <TabsTrigger value="funcionarios">Funcionários</TabsTrigger>
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
        <TabsContent value="funcionarios">
             <Card>
                <CardHeader>
                    <CardTitle>Funcionários</CardTitle>
                    <CardDescription>Lista de todos os funcionários cadastrados no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <EmployeeList />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

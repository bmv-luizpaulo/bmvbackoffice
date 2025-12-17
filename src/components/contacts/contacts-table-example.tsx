'use client';

import * as React from "react";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, Users } from 'lucide-react';
import type { Contact } from "@/lib/types";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { ContactImportExportDialog } from './contact-import-export';

export function ContactsTableExample() {
  const firestore = useFirestore();
  const [isImportExportOpen, setIsImportExportOpen] = React.useState(false);
  
  const contactsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'contacts') : null, [firestore]);
  const { data: contactsData, isLoading } = useCollection<Contact>(contactsQuery);
  const contacts = React.useMemo(() => contactsData ?? [], [contactsData]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-8 w-8 text-primary"/>
          Contatos
        </h1>
        <p className="text-muted-foreground">
          Gerencie seus clientes, fornecedores e parceiros.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Contatos</CardTitle>
              <CardDescription>
                Importar e gerenciar contatos do sistema.
              </CardDescription>
            </div>
            <Button onClick={() => setIsImportExportOpen(true)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Import/Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p>Carregando contatos...</p>
            </div>
          ) : contacts.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {contacts.length} contato(s) encontrado(s)
              </p>
              
              {/* Exemplo de lista simples */}
              <div className="grid gap-4">
                {contacts.slice(0, 5).map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {contact.email} • {contact.celular}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {contact.tipo}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {contact.tipoDocumento}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {contacts.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... e mais {contacts.length - 5} contatos
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">Nenhum contato encontrado</p>
              <Button onClick={() => setIsImportExportOpen(true)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Importar Contatos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ContactImportExportDialog
        isOpen={isImportExportOpen}
        onOpenChange={setIsImportExportOpen}
        contacts={contacts}
      />
    </div>
  );
}

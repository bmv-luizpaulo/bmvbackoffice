// This is a new file: src/components/agenda/contact-data-table.tsx
'use client';

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Contact } from "@/lib/types";
import { ContactFormDialog } from "./contact-form-dialog";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";

const addDocumentNonBlocking = (ref: any, data: any) => {
    return addDoc(ref, data).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: ref.path,
            operation: 'create',
            requestResourceData: data,
        }));
        throw err;
    });
};

const updateDocumentNonBlocking = (ref: any, data: any) => {
    return updateDoc(ref, data).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: ref.path,
            operation: 'update',
            requestResourceData: data,
        }));
        throw err;
    });
};

const deleteDocumentNonBlocking = (ref: any) => {
    return deleteDoc(ref).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: ref.path,
            operation: 'delete',
        }));
        throw err;
    });
};

interface ContactDataTableProps {
    type: 'cliente' | 'fornecedor';
}

export function ContactDataTable({ type }: ContactDataTableProps) {
  const firestore = useFirestore();
  const contactsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'contacts'), where('type', '==', type)) : null, [firestore, type]);
  const { data: contacts, isLoading } = useCollection<Contact>(contactsQuery);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);

  const handleSaveContact = (contactData: Omit<Contact, 'id' | 'type'>) => {
    if (!firestore) return;
    
    const dataToSave = { ...contactData, type };

    if (selectedContact) {
      // Update
      const contactRef = doc(firestore, 'contacts', selectedContact.id);
      updateDocumentNonBlocking(contactRef, dataToSave);
    } else {
      // Create
      addDocumentNonBlocking(collection(firestore, 'contacts'), dataToSave);
    }
  };

  const handleDeleteContact = () => {
    if (!firestore || !selectedContact) return;
    const contactRef = doc(firestore, 'contacts', selectedContact.id);
    deleteDocumentNonBlocking(contactRef);
    setIsAlertOpen(false);
    setSelectedContact(null);
  }
  
  const typeLabel = type === 'cliente' ? 'Cliente' : 'Fornecedor';

  const columns: ColumnDef<Contact>[] = [
    {
      accessorKey: "name",
      header: "Nome",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
     {
      accessorKey: "phone",
      header: "Telefone",
    },
    {
      accessorKey: "companyName",
      header: "Empresa",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const contact = row.original
   
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => {setSelectedContact(contact); setIsFormOpen(true)}}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => {setSelectedContact(contact); setIsAlertOpen(true)}}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: contacts || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div>
       <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filtrar por nome..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Button onClick={() => {setSelectedContact(null); setIsFormOpen(true)}}>Adicionar {typeLabel}</Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {isLoading ? `Carregando ${type}s...` : "Nenhum resultado."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Próximo
        </Button>
      </div>

      <ContactFormDialog 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSaveContact}
        contact={selectedContact}
        type={type}
      />
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente o contato "{selectedContact?.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSelectedContact(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteContact}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

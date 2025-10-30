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
import dynamic from "next/dynamic";

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
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, orderBy, limit as fbLimit } from "firebase/firestore";
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
import { updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";

const ContactFormDialog = dynamic(() => import('./contact-form-dialog').then(m => m.ContactFormDialog), { ssr: false });

interface ContactDataTableProps {
    type: 'cliente' | 'fornecedor' | 'parceiro';
}

export function ContactDataTable({ type }: ContactDataTableProps) {
  const firestore = useFirestore();
  const [pageSize, setPageSize] = React.useState<number>(50);
  const contactsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, 'contacts'),
            where('type', '==', type),
            orderBy('name'),
            fbLimit(pageSize)
          )
        : null,
    [firestore, type, pageSize]
  );
  const { data: contacts, isLoading } = useCollection<Contact>(contactsQuery);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [nameFilter, setNameFilter] = React.useState<string>('');
  const deferredNameFilter = (React as any).useDeferredValue ? (React as any).useDeferredValue(nameFilter) : nameFilter;
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);

  const handleEditClick = React.useCallback((contact: Contact) => {
    setSelectedContact(contact);
    setIsFormOpen(true);
  }, []);

  const handleDeleteClick = React.useCallback((contact: Contact) => {
    setSelectedContact(contact);
    setIsAlertOpen(true);
  }, []);

  const handleSaveContact = React.useCallback((contactData: Omit<Contact, 'id' | 'type'>) => {
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
  }, [firestore, selectedContact, type]);

  const handleDeleteContact = React.useCallback(() => {
    if (!firestore || !selectedContact) return;
    const contactRef = doc(firestore, 'contacts', selectedContact.id);
    deleteDocumentNonBlocking(contactRef);
    setIsAlertOpen(false);
    setSelectedContact(null);
  }, [firestore, selectedContact]);
  
  const handleAddNewClick = React.useCallback(() => {
    setSelectedContact(null);
    setIsFormOpen(true);
  }, []);
  
  const typeLabel = React.useMemo(() => type.charAt(0).toUpperCase() + type.slice(1), [type]);

  const columns: ColumnDef<Contact>[] = React.useMemo(() => [
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
              <DropdownMenuItem onClick={() => handleEditClick(contact)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => handleDeleteClick(contact)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [handleEditClick, handleDeleteClick]);

  const table = useReactTable({
    data: contacts || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 10 } },
    state: {
      sorting,
      columnFilters,
    },
  });

  React.useEffect(() => {
    table.getColumn('name')?.setFilterValue(deferredNameFilter);
  }, [deferredNameFilter, table]);

  return (
    <div>
       <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filtrar por nome..."
          value={nameFilter}
          onChange={(event) => setNameFilter(event.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleAddNewClick}>Adicionar {typeLabel}</Button>
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
      <div className="flex flex-wrap items-center justify-between gap-2 py-4">
        <div className="text-sm text-muted-foreground">
          {contacts ? `${Math.min(contacts.length, pageSize)} de ${pageSize}${contacts.length < pageSize ? '' : '+'}` : ''}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageSize((s) => Math.min(s + 50, 1000))}
            disabled={isLoading}
          >
            Carregar mais
          </Button>
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
      </div>

      {isFormOpen && (
        <ContactFormDialog 
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSave={handleSaveContact}
          contact={selectedContact}
          type={type}
        />
      )}
      
      {isAlertOpen && (
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
      )}
    </div>
  )
}

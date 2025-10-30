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
  VisibilityState,
} from "@tanstack/react-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
import type { Seal, Product, Contact } from "@/lib/types";
import { SealFormDialog } from "./seal-form-dialog";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
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
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

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

export function SealDataTable() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const sealsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'seals') : null, [firestore]);
  const { data: seals, isLoading: isLoadingSeals } = useCollection<Seal>(sealsQuery);

  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsQuery);

  const contactsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'contacts') : null, [firestore]);
  const { data: contacts } = useCollection<Contact>(contactsQuery);

  const productsMap = React.useMemo(() => new Map(products?.map(p => [p.id, p.name])), [products]);
  const contactsMap = React.useMemo(() => new Map(contacts?.map(c => [c.id, c.name])), [contacts]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedSeal, setSelectedSeal] = React.useState<Seal | null>(null);

  const isLoading = isLoadingSeals;

  const handleSaveSeal = (sealData: Omit<Seal, 'id'>) => {
    if (!firestore) return;
    
    if (selectedSeal) {
      const sealRef = doc(firestore, 'seals', selectedSeal.id);
      updateDocumentNonBlocking(sealRef, sealData);
      toast({ title: "Selo Atualizado", description: "O selo foi atualizado com sucesso." });
    } else {
      addDocumentNonBlocking(collection(firestore, 'seals'), sealData);
      toast({ title: "Selo Adicionado", description: "O novo selo foi cadastrado." });
    }
  };

  const handleDeleteSeal = () => {
    if (!firestore || !selectedSeal) return;
    const sealRef = doc(firestore, 'seals', selectedSeal.id);
    deleteDocumentNonBlocking(sealRef);
    toast({ title: "Selo Excluído", description: "O selo foi removido do sistema." });
    setIsAlertOpen(false);
    setSelectedSeal(null);
  }

  const columns: ColumnDef<Seal>[] = React.useMemo(() => [
    {
      accessorKey: "productId",
      header: "Produto",
      cell: ({ row }) => productsMap.get(row.original.productId) || 'Desconhecido',
      filterFn: (row, id, value) => {
          const productName = productsMap.get(row.original.productId) || '';
          return productName.toLowerCase().includes(value.toLowerCase());
      }
    },
    {
      accessorKey: "contactId",
      header: "Cliente",
      cell: ({ row }) => contactsMap.get(row.original.contactId) || 'Desconhecido',
      filterFn: (row, id, value) => {
          const contactName = contactsMap.get(row.original.contactId) || '';
          return contactName.toLowerCase().includes(value.toLowerCase());
      }
    },
    {
        accessorKey: "issueDate",
        header: "Data de Emissão",
        cell: ({ row }) => format(new Date(row.original.issueDate), 'dd/MM/yyyy'),
    },
    {
        accessorKey: "expiryDate",
        header: "Data de Vencimento",
        cell: ({ row }) => {
            const expiryDate = new Date(row.original.expiryDate);
            const daysLeft = differenceInDays(expiryDate, new Date());
            let color = "text-foreground";
            if (isPast(expiryDate) && !isToday(expiryDate)) color = "text-destructive";
            else if (daysLeft <= 30) color = "text-amber-600";
            
            return <span className={cn(color)}>{format(expiryDate, 'dd/MM/yyyy')}</span>
        }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
        if (status === 'Ativo') variant = 'default';
        if (status === 'Vencido') variant = 'destructive';
        if (status === 'Em Renovação') variant = 'outline';
        return <Badge variant={variant}>{status}</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const seal = row.original
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
              <DropdownMenuItem onClick={() => {setSelectedSeal(seal); setIsFormOpen(true)}}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => {setSelectedSeal(seal); setIsAlertOpen(true)}}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [productsMap, contactsMap]);

  const table = useReactTable({
    data: seals || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility
    },
  });

  return (
    <div>
       <div className="flex items-center justify-between py-4 gap-4">
        <div className="flex items-center gap-2">
            <Input
            placeholder="Filtrar por produto..."
            value={(table.getColumn("productId")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
                table.getColumn("productId")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
            />
            <Input
            placeholder="Filtrar por cliente..."
            value={(table.getColumn("contactId")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
                table.getColumn("contactId")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
            />
        </div>
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto">
                    Colunas
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {table
                    .getAllColumns()
                    .filter(
                        (column) => column.getCanHide()
                    )
                    .map((column) => {
                        return (
                        <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                            }
                        >
                            {column.id}
                        </DropdownMenuCheckboxItem>
                        )
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => {setSelectedSeal(null); setIsFormOpen(true)}}>Adicionar Selo</Button>
        </div>
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
                  {isLoading ? `Carregando selos...` : "Nenhum selo cadastrado."}
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

      <SealFormDialog 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSaveSeal}
        seal={selectedSeal}
        products={products || []}
        contacts={contacts || []}
      />
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente o selo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSelectedSeal(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSeal}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

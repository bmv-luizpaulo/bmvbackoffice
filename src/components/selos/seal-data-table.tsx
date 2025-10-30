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
import type { Seal, Product, Contact, User } from "@/lib/types";
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase";
import { collection, doc, query, orderBy, limit as fbLimit } from "firebase/firestore";
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
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useNotifications } from "../notifications/notifications-provider";
import dynamic from "next/dynamic";

const SealFormDialog = dynamic(() => import('./seal-form-dialog').then(m => m.SealFormDialog), { ssr: false });

export function SealDataTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: authUser } = useUser();
  const { createNotification } = useNotifications();


  const [pageSize, setPageSize] = React.useState<number>(50);
  const sealsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'seals'), orderBy('issueDate', 'desc'), fbLimit(pageSize)) : null,
    [firestore, pageSize]
  );
  const { data: sealsData, isLoading: isLoadingSeals } = useCollection<Seal>(sealsQuery);
  const data = React.useMemo(() => sealsData ?? [], [sealsData]);

  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsQuery);

  const contactsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'contacts') : null, [firestore]);
  const { data: contacts } = useCollection<Contact>(contactsQuery);
  
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData } = useCollection<User>(usersQuery);
  const usersMap = React.useMemo(() => new Map(usersData?.map(u => [u.id, u])), [usersData]);

  const productsMap = React.useMemo(() => new Map(products?.map(p => [p.id, p.name])), [products]);
  const contactsMap = React.useMemo(() => new Map(contacts?.map(c => [c.id, c.name])), [contacts]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [productFilter, setProductFilter] = React.useState<string>('');
  const [contactFilter, setContactFilter] = React.useState<string>('');
  const deferredProductFilter = (React as any).useDeferredValue ? (React as any).useDeferredValue(productFilter) : productFilter;
  const deferredContactFilter = (React as any).useDeferredValue ? (React as any).useDeferredValue(contactFilter) : contactFilter;
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedSeal, setSelectedSeal] = React.useState<Seal | null>(null);

  const isLoading = isLoadingSeals;

  const handleEditClick = React.useCallback((seal: Seal) => {
    setSelectedSeal(seal);
    setIsFormOpen(true);
  }, []);

  const handleDeleteClick = React.useCallback((seal: Seal) => {
    setSelectedSeal(seal);
    setIsAlertOpen(true);
  }, []);

  const handleSaveSeal = React.useCallback((sealData: Omit<Seal, 'id'>, sealId?: string) => {
    if (!firestore || !authUser) return;
    
    if (sealId) {
      const sealRef = doc(firestore, 'seals', sealId);
      updateDocumentNonBlocking(sealRef, sealData);
      toast({ title: "Selo Atualizado", description: "O selo foi atualizado com sucesso." });
    } else {
      addDocumentNonBlocking(collection(firestore, 'seals'), sealData);
      toast({ title: "Selo Adicionado", description: "O novo selo foi cadastrado." });
    }

    const expiryDate = new Date(sealData.expiryDate);
    const daysLeft = differenceInDays(expiryDate, new Date());
    if (daysLeft <= 30 && daysLeft >= 0) {
      const productName = productsMap.get(sealData.productId) || 'desconhecido';
      const contactName = contactsMap.get(sealData.contactId) || 'desconhecido';

      // Find a manager to notify
      const manager = usersData?.find(u => (u as any).role === 'Gestor');
      const notifyUserId = manager?.id || authUser.uid;

      createNotification(notifyUserId, {
        title: 'Renovação de Selo Próxima',
        message: `Selo para ${productName} (${contactName}) vence em ${daysLeft + 1} dia(s).`,
        link: `/selos`,
      });
    }
  }, [firestore, authUser, toast, createNotification, productsMap, contactsMap, usersData]);

  const handleDeleteSeal = React.useCallback(() => {
    if (!firestore || !selectedSeal) return;
    const sealRef = doc(firestore, 'seals', selectedSeal.id);
    deleteDocumentNonBlocking(sealRef);
    toast({ title: "Selo Excluído", description: "O selo foi removido do sistema." });
    setIsAlertOpen(false);
    setSelectedSeal(null);
  }, [firestore, selectedSeal, toast]);
  
  const handleAddNewClick = React.useCallback(() => {
    setSelectedSeal(null);
    setIsFormOpen(true);
  }, []);

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
        header: "Vencimento",
        cell: ({ row }) => {
            const expiryDate = new Date(row.original.expiryDate);
            const daysLeft = differenceInDays(expiryDate, new Date());

            if (isPast(expiryDate) && !isToday(expiryDate)) {
                return <span className="text-destructive font-medium">{format(expiryDate, 'dd/MM/yyyy')}</span>
            }
            if (daysLeft <= 30) {
                 return <span className="text-amber-600 font-medium">{`em ${daysLeft + 1} dia(s)`}</span>
            }
            return <span>{format(expiryDate, 'dd/MM/yyyy')}</span>
        }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const expiryDate = new Date(row.original.expiryDate);
        const daysLeft = differenceInDays(expiryDate, new Date());

        let status: 'Ativo' | 'Vencendo' | 'Vencido' = 'Ativo';
        let variant: "default" | "destructive" | "outline" = 'default';

        if (isPast(expiryDate) && !isToday(expiryDate)) {
          status = 'Vencido';
          variant = 'destructive';
        } else if (daysLeft <= 30) {
          status = 'Vencendo';
          variant = 'outline';
        }

        return <Badge variant={variant}>{row.original.status}</Badge>
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
              <DropdownMenuItem onClick={() => handleEditClick(seal)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => handleDeleteClick(seal)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [productsMap, contactsMap, handleEditClick, handleDeleteClick]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    initialState: { pagination: { pageSize: 10 } },
    state: {
      sorting,
      columnFilters,
      columnVisibility
    },
  });

  React.useEffect(() => {
    table.getColumn('productId')?.setFilterValue(deferredProductFilter);
  }, [deferredProductFilter, table]);

  React.useEffect(() => {
    table.getColumn('contactId')?.setFilterValue(deferredContactFilter);
  }, [deferredContactFilter, table]);

  return (
    <div>
       <div className="flex items-center justify-between py-4 gap-4">
        <div className="flex items-center gap-2">
            <Input
              placeholder="Filtrar por produto..."
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="max-w-sm"
            />
            <Input
              placeholder="Filtrar por cliente..."
              value={contactFilter}
              onChange={(e) => setContactFilter(e.target.value)}
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
                            {column.id === 'productId' ? 'Produto' : 
                             column.id === 'contactId' ? 'Cliente' :
                             column.id === 'issueDate' ? 'Data de Emissão' :
                             column.id === 'expiryDate' ? 'Vencimento' :
                             column.id
                            }
                        </DropdownMenuCheckboxItem>
                        )
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleAddNewClick}>Adicionar Selo</Button>
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
      <div className="flex flex-wrap items-center justify-between gap-2 py-4">
        <div className="text-sm text-muted-foreground">
          {sealsData ? `${Math.min(sealsData.length, pageSize)} de ${pageSize}${sealsData.length < pageSize ? '' : '+'}` : ''}
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

      {isFormOpen && <SealFormDialog 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSaveSeal}
        seal={selectedSeal}
        products={products || []}
        contacts={contacts || []}
      />}
      
      {isAlertOpen && <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
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
      </AlertDialog>}
    </div>
  )
}
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
import type { CostCenter, User } from "@/lib/types";
import dynamic from "next/dynamic";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
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
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { useToast } from "@/hooks/use-toast"

const CostCenterFormDialog = dynamic(() => import('./cost-center-form-dialog').then(m => m.CostCenterFormDialog), { ssr: false });

export function CostCenterDataTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const costCentersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'costCenters') : null, [firestore]);
  const { data: costCentersData, isLoading: isLoadingCostCenters } = useCollection<CostCenter>(costCentersQuery);

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  
  const usersMap = React.useMemo(() => new Map(usersData?.map(u => [u.id, u.name])), [usersData]);
  const data = React.useMemo(() => costCentersData ?? [], [costCentersData]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedCostCenter, setSelectedCostCenter] = React.useState<CostCenter | null>(null);

  const isLoading = isLoadingCostCenters || isLoadingUsers;
  
  const handleEditClick = React.useCallback((costCenter: CostCenter) => {
    setSelectedCostCenter(costCenter);
    setIsFormOpen(true);
  }, []);

  const handleDeleteClick = React.useCallback((costCenter: CostCenter) => {
    setSelectedCostCenter(costCenter);
    setIsAlertOpen(true);
  }, []);

  const handleSaveCostCenter = React.useCallback(async (costCenterData: Omit<CostCenter, 'id'>, costCenterId?: string) => {
    if (!firestore) return;

    const dataToSave = {
        ...costCenterData,
        responsibleId: costCenterData.responsibleId === 'unassigned' ? undefined : costCenterData.responsibleId,
    };

    if (costCenterId) {
        const costCenterRef = doc(firestore, 'costCenters', costCenterId);
        await updateDocumentNonBlocking(costCenterRef, dataToSave);
        toast({ title: "Centro de Custo Atualizado", description: `O centro de custo "${dataToSave.name}" foi atualizado.` });
    } else {
        await addDocumentNonBlocking(collection(firestore, 'costCenters'), dataToSave);
        toast({ title: "Centro de Custo Criado", description: `O centro de custo "${dataToSave.name}" foi criado com sucesso.` });
    }
    setIsFormOpen(false);
  }, [firestore, toast]);


  const handleDeleteCostCenter = React.useCallback(async () => {
    if (!firestore || !selectedCostCenter) return;
    
    // TODO: Add check if cost center is in use by any reimbursement
    
    const costCenterRef = doc(firestore, 'costCenters', selectedCostCenter.id);
    deleteDocumentNonBlocking(costCenterRef);
    
    toast({ title: "Centro de Custo Excluído", description: `O centro de custo "${selectedCostCenter.name}" foi removido.`, variant: 'destructive' });
    setIsAlertOpen(false);
    setSelectedCostCenter(null);
  }, [firestore, selectedCostCenter, toast]);

  const columns: ColumnDef<CostCenter>[] = React.useMemo(() => [
    {
      accessorKey: "name",
      header: "Nome do Centro de Custo",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
        accessorKey: "code",
        header: "Código",
        cell: ({ row }) => row.original.code || <span className="text-muted-foreground">N/A</span>,
    },
    {
      accessorKey: "responsibleId",
      header: "Responsável",
      cell: ({ row }) => usersMap.get(row.original.responsibleId || '') || <span className="text-muted-foreground">N/A</span>,
    },
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => <p className="text-muted-foreground max-w-xs truncate">{row.original.description}</p>
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const costCenter = row.original
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleEditClick(costCenter)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-500 focus:bg-red-50"
                  onClick={() => handleDeleteClick(costCenter)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ], [handleEditClick, handleDeleteClick, usersMap]);

  const table = useReactTable({
    data,
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
        <Button onClick={() => {setSelectedCostCenter(null); setIsFormOpen(true)}}>Adicionar Centro de Custo</Button>
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
                  {isLoading ? "Carregando centros de custo..." : "Nenhum centro de custo encontrado."}
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

      {isFormOpen && (
        <CostCenterFormDialog 
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSave={handleSaveCostCenter}
          costCenter={selectedCostCenter}
          users={usersData || []}
        />
      )}

      {isAlertOpen && (
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o centro de custo "{selectedCostCenter?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedCostCenter(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCostCenter} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

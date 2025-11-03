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
import type { Asset, AssetMaintenance } from "@/lib/types";
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
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const MaintenanceFormDialog = dynamic(() => import('./maintenance-form-dialog').then(m => m.MaintenanceFormDialog), { ssr: false });


export function MaintenanceDataTable() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const maintenancesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'maintenances') : null, [firestore]);
  const { data: maintenancesData, isLoading: isLoadingMaintenances } = useCollection<AssetMaintenance>(maintenancesQuery);
  
  const assetsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'assets') : null, [firestore]);
  const { data: assetsData, isLoading: isLoadingAssets } = useCollection<Asset>(assetsQuery);

  const assetsMap = React.useMemo(() => new Map(assetsData?.map(a => [a.id, a.name])), [assetsData]);
  const data = React.useMemo(() => maintenancesData ?? [], [maintenancesData]);

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'scheduledDate', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = React.useState<AssetMaintenance | null>(null);

  const isLoading = isLoadingMaintenances || isLoadingAssets;

  const handleEditClick = React.useCallback((maintenance: AssetMaintenance) => {
    setSelectedMaintenance(maintenance);
    setIsFormOpen(true);
  }, []);

  const handleDeleteClick = React.useCallback((maintenance: AssetMaintenance) => {
    setSelectedMaintenance(maintenance);
    setIsAlertOpen(true);
  }, []);

  const handleSaveMaintenance = React.useCallback(async (maintenanceData: Omit<AssetMaintenance, 'id'>, maintenanceId?: string) => {
    if (!firestore) return;
    
    if (maintenanceId) {
      const maintenanceRef = doc(firestore, 'maintenances', maintenanceId);
      await updateDocumentNonBlocking(maintenanceRef, maintenanceData);
      toast({ title: "Manutenção Atualizada", description: "O registro de manutenção foi atualizado." });
    } else {
      await addDocumentNonBlocking(collection(firestore, 'maintenances'), maintenanceData);
      toast({ title: "Manutenção Agendada", description: "A manutenção foi agendada com sucesso." });
    }
  }, [firestore, toast]);

  const handleDeleteMaintenance = React.useCallback(async () => {
    if (!firestore || !selectedMaintenance) return;
    const maintenanceRef = doc(firestore, 'maintenances', selectedMaintenance.id);
    deleteDocumentNonBlocking(maintenanceRef);
    toast({ title: "Manutenção Excluída", description: "O registro de manutenção foi removido.", variant: 'destructive' });
    setIsAlertOpen(false);
    setSelectedMaintenance(null);
  }, [firestore, selectedMaintenance, toast]);
  
  const handleAddNewClick = React.useCallback(() => {
    setSelectedMaintenance(null);
    setIsFormOpen(true);
  }, []);

  const getStatusColor = (status: AssetMaintenance['status']) => {
    switch (status) {
        case 'Agendada': return 'bg-blue-500 hover:bg-blue-500';
        case 'Em Andamento': return 'bg-amber-500 hover:bg-amber-500';
        case 'Concluída': return 'bg-green-600 hover:bg-green-600';
        case 'Cancelada': return 'bg-gray-500 hover:bg-gray-500';
        default: return 'bg-primary hover:bg-primary';
    }
  }


  const columns: ColumnDef<AssetMaintenance>[] = React.useMemo(() => [
    {
      accessorKey: "assetId",
      header: "Ativo",
      cell: ({ row }) => <span className="font-medium">{assetsMap.get(row.original.assetId) || <span className="text-muted-foreground">Desconhecido</span>}</span>
    },
    {
      accessorKey: "description",
      header: "Descrição do Serviço",
      cell: ({ row }) => <p className="max-w-xs truncate">{row.original.description}</p>
    },
    {
      accessorKey: "scheduledDate",
      header: "Data Agendada",
      cell: ({ row }) => format(new Date(row.original.scheduledDate), 'dd/MM/yyyy')
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge className={cn(getStatusColor(row.original.status))}>{row.original.status}</Badge>
    },
    {
      accessorKey: "cost",
      header: "Custo (R$)",
      cell: ({ row }) => row.original.cost ? `R$ ${row.original.cost.toFixed(2)}` : <span className="text-muted-foreground">N/D</span>
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const maintenance = row.original
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
                <DropdownMenuItem onClick={() => handleEditClick(maintenance)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-500 focus:bg-red-50"
                  onClick={() => handleDeleteClick(maintenance)}
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
  ], [assetsMap, handleEditClick, handleDeleteClick]);

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
          placeholder="Filtrar por descrição..."
          value={(table.getColumn("description")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("description")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Button onClick={handleAddNewClick}>Agendar Manutenção</Button>
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
                  {isLoading ? "Carregando manutenções..." : "Nenhuma manutenção agendada."}
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
        <MaintenanceFormDialog 
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSave={handleSaveMaintenance}
          maintenance={selectedMaintenance}
          assets={assetsData || []}
        />
      )}

      {isAlertOpen && (
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro de manutenção.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedMaintenance(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteMaintenance} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

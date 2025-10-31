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
import type { Asset, User } from "@/lib/types";
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
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import dynamic from "next/dynamic";
import { format } from "date-fns";

const AssetFormDialog = dynamic(() => import('./asset-form-dialog').then(m => m.AssetFormDialog), { ssr: false });

export function AssetDataTable() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const assetsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'assets') : null, [firestore]);
  const { data: assetsData, isLoading: isLoadingAssets } = useCollection<Asset>(assetsQuery);
  
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const usersMap = React.useMemo(() => new Map(usersData?.map(u => [u.id, u.name])), [usersData]);
  const data = React.useMemo(() => assetsData ?? [], [assetsData]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null);

  const isLoading = isLoadingAssets || isLoadingUsers;

  const handleEditClick = React.useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormOpen(true);
  }, []);

  const handleDeleteClick = React.useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setIsAlertOpen(true);
  }, []);

  const handleSaveAsset = React.useCallback((assetData: Omit<Asset, 'id'>, assetId?: string) => {
    if (!firestore) return;
    
    if (assetId) {
      const assetRef = doc(firestore, 'assets', assetId);
      updateDocumentNonBlocking(assetRef, assetData);
      toast({ title: "Ativo Atualizado", description: "O ativo foi atualizado com sucesso." });
    } else {
      addDocumentNonBlocking(collection(firestore, 'assets'), assetData);
      toast({ title: "Ativo Adicionado", description: "O novo ativo foi cadastrado." });
    }
  }, [firestore, toast]);

  const handleDeleteAsset = React.useCallback(() => {
    if (!firestore || !selectedAsset) return;
    const assetRef = doc(firestore, 'assets', selectedAsset.id);
    deleteDocumentNonBlocking(assetRef);
    toast({ title: "Ativo Excluído", description: "O ativo foi removido do sistema." });
    setIsAlertOpen(false);
    setSelectedAsset(null);
  }, [firestore, selectedAsset, toast]);
  
  const handleAddNewClick = React.useCallback(() => {
    setSelectedAsset(null);
    setIsFormOpen(true);
  }, []);

  const columns: ColumnDef<Asset>[] = React.useMemo(() => [
    {
      accessorKey: "name",
      header: "Nome do Ativo",
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => <Badge variant="outline">{row.original.type}</Badge>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>
    },
    {
      accessorKey: "assigneeId",
      header: "Responsável",
      cell: ({ row }) => usersMap.get(row.original.assigneeId || '') || <span className="text-muted-foreground">N/A</span>,
    },
    {
      accessorKey: "location",
      header: "Localização",
    },
    {
        accessorKey: "purchaseDate",
        header: "Data da Compra",
        cell: ({ row }) => row.original.purchaseDate ? format(new Date(row.original.purchaseDate), 'dd/MM/yyyy') : 'N/A',
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const asset = row.original
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
              <DropdownMenuItem onClick={() => handleEditClick(asset)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => handleDeleteClick(asset)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [usersMap, handleEditClick, handleDeleteClick]);

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

  return (
    <div>
       <div className="flex items-center justify-between py-4 gap-4">
        <Input
          placeholder="Filtrar por nome..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
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
                            {column.id === 'name' ? 'Nome' : 
                             column.id === 'type' ? 'Tipo' :
                             column.id === 'status' ? 'Status' :
                             column.id === 'assigneeId' ? 'Responsável' :
                             column.id === 'location' ? 'Localização' :
                             column.id === 'purchaseDate' ? 'Data da Compra' :
                             column.id
                            }
                        </DropdownMenuCheckboxItem>
                        )
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleAddNewClick}>Adicionar Ativo</Button>
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
                  {isLoading ? `Carregando ativos...` : "Nenhum ativo cadastrado."}
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

      {isFormOpen && <AssetFormDialog 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSaveAsset}
        asset={selectedAsset}
        users={usersData || []}
      />}
      
      {isAlertOpen && <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente o ativo "{selectedAsset?.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSelectedAsset(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAsset} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>}
    </div>
  )
}

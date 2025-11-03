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
import type { Directorate, User } from "@/lib/types";
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

const DirectorateFormDialog = dynamic(() => import('./directorate-form-dialog').then(m => m.DirectorateFormDialog), { ssr: false });

export function DirectorateDataTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const directoratesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'directorates') : null, [firestore]);
  const { data: directoratesData, isLoading: isLoadingDirectorates } = useCollection<Directorate>(directoratesQuery);
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  
  const usersMap = React.useMemo(() => new Map(usersData?.map(u => [u.id, u.name])), [usersData]);
  const data = React.useMemo(() => directoratesData ?? [], [directoratesData]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedDirectorate, setSelectedDirectorate] = React.useState<Directorate | null>(null);
  
  const isLoading = isLoadingDirectorates || isLoadingUsers;

  const handleEditClick = React.useCallback((directorate: Directorate) => {
    setSelectedDirectorate(directorate);
    setIsFormOpen(true);
  }, []);

  const handleDeleteClick = React.useCallback((directorate: Directorate) => {
    setSelectedDirectorate(directorate);
    setIsAlertOpen(true);
  }, []);

  const handleSaveDirectorate = React.useCallback(async (directorateData: Omit<Directorate, 'id'>, directorateId?: string) => {
    if (!firestore) return;

    if (directorateId) {
        const directorateRef = doc(firestore, 'directorates', directorateId);
        await updateDocumentNonBlocking(directorateRef, directorateData);
        toast({ title: "Diretoria Atualizada", description: `A diretoria "${directorateData.name}" foi atualizada.` });
    } else {
        await addDocumentNonBlocking(collection(firestore, 'directorates'), directorateData);
        toast({ title: "Diretoria Criada", description: `A diretoria "${directorateData.name}" foi criada com sucesso.` });
    }
    setIsFormOpen(false);
  }, [firestore, toast]);


  const handleDeleteDirectorate = React.useCallback(async () => {
    if (!firestore || !selectedDirectorate) return;
    
    // TODO: Add check if directorate is in use by any team
    
    const directorateRef = doc(firestore, 'directorates', selectedDirectorate.id);
    deleteDocumentNonBlocking(directorateRef);
    
    toast({ title: "Diretoria Excluída", description: `A diretoria "${selectedDirectorate.name}" foi removida.`, variant: 'destructive' });
    setIsAlertOpen(false);
    setSelectedDirectorate(null);
  }, [firestore, selectedDirectorate, toast]);

  const columns: ColumnDef<Directorate>[] = React.useMemo(() => [
    {
      accessorKey: "name",
      header: "Nome da Diretoria",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
     {
      accessorKey: "directorId",
      header: "Diretor Responsável",
      cell: ({ row }) => usersMap.get(row.original.directorId || '') || <span className="text-muted-foreground">N/D</span>,
    },
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => <p className="text-muted-foreground max-w-xs truncate">{row.original.description}</p>
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const directorate = row.original
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
                <DropdownMenuItem onClick={() => handleEditClick(directorate)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-500 focus:bg-red-50"
                  onClick={() => handleDeleteClick(directorate)}
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
        <Button onClick={() => {setSelectedDirectorate(null); setIsFormOpen(true)}}>Adicionar Diretoria</Button>
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
                  {isLoading ? "Carregando diretorias..." : "Nenhuma diretoria encontrada."}
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
        <DirectorateFormDialog 
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSave={handleSaveDirectorate}
          directorate={selectedDirectorate}
        />
      )}

      {isAlertOpen && (
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente a diretoria "{selectedDirectorate?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedDirectorate(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteDirectorate} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

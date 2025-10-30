// THIS IS A NEW FILE
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
import type { Role } from "@/lib/types";
import dynamic from "next/dynamic";
import { useFirestore, useCollection } from "@/firebase";
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
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "../ui/badge";

const RoleFormDialog = dynamic(() => import('./role-form-dialog').then(m => m.RoleFormDialog), { ssr: false });

export function RoleDataTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const rolesQuery = React.useMemo(() => firestore ? collection(firestore, 'roles') : null, [firestore]);
  const { data: rolesData, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);
  
  const data = React.useMemo(() => rolesData ?? [], [rolesData]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);
  
  const isLoading = isLoadingRoles;

  const handleEditClick = React.useCallback((role: Role) => {
    setSelectedRole(role);
    setIsFormOpen(true);
  }, []);

  const handleDeleteClick = React.useCallback((role: Role) => {
    setSelectedRole(role);
    setIsAlertOpen(true);
  }, []);

  const handleSaveRole = React.useCallback((roleData: Omit<Role, 'id'>, roleId?: string) => {
    if (!firestore) return;

    if (roleId) {
        const roleRef = doc(firestore, 'roles', roleId);
        updateDocumentNonBlocking(roleRef, roleData);
        toast({ title: "Cargo Atualizado", description: `O cargo "${roleData.name}" foi atualizado.` });
    } else {
        addDocumentNonBlocking(collection(firestore, 'roles'), roleData);
        toast({ title: "Cargo Criado", description: `O cargo "${roleData.name}" foi criado com sucesso.` });
    }
  }, [firestore, toast]);


  const handleDeleteRole = React.useCallback(async () => {
    if (!firestore || !selectedRole) return;
    
    // TODO: Check if any user has this role before deleting
    
    const roleRef = doc(firestore, 'roles', selectedRole.id);
    deleteDocumentNonBlocking(roleRef);
    
    toast({ title: "Cargo Excluído", description: `O cargo "${selectedRole.name}" foi removido.`, variant: 'destructive' });
    setIsAlertOpen(false);
    setSelectedRole(null);
  }, [firestore, selectedRole, toast]);

  const columns: ColumnDef<Role>[] = React.useMemo(() => [
    {
      accessorKey: "name",
      header: "Nome do Cargo",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => <p className="text-muted-foreground max-w-xs truncate">{row.original.description}</p>
    },
    {
        accessorKey: "isManager",
        header: "Permissões de Gestor",
        cell: ({ row }) => row.original.isManager ? <Badge>Sim</Badge> : <Badge variant="secondary">Não</Badge>
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const role = row.original
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
                <DropdownMenuItem onClick={() => handleEditClick(role)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-500 focus:bg-red-50"
                  onClick={() => handleDeleteClick(role)}
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
  ], [handleEditClick, handleDeleteClick]);

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
        <Button onClick={() => {setSelectedRole(null); setIsFormOpen(true)}}>Adicionar Cargo</Button>
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
                  {isLoading ? "Carregando cargos..." : "Nenhum cargo encontrado."}
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
        <RoleFormDialog 
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSave={handleSaveRole}
          role={selectedRole}
        />
      )}

      {isAlertOpen && (
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o cargo "{selectedRole?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedRole(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

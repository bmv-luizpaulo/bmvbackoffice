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
import { MoreHorizontal, Pencil, ShieldCheck, ShieldOff, Trash2 } from "lucide-react"

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
import type { User } from "@/lib/types";
import dynamic from "next/dynamic";
import { useFirestore, useCollection, useMemoFirebase, useUser as useAuthUser } from "@/firebase";
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
import { useToast } from "@/hooks/use-toast"

const UserFormDialog = dynamic(() => import('./user-form-dialog').then(m => m.UserFormDialog), { ssr: false });

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

export function UserDataTable() {
  const firestore = useFirestore();
  const { user: currentUser } = useAuthUser();
  const { toast } = useToast();
  
  const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading } = useCollection<User>(usersCollection);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [emailFilter, setEmailFilter] = React.useState("");

  const handleSaveUser = (userData: Omit<User, 'id' | 'avatarUrl'>) => {
    if (!firestore) return;
    
    if (selectedUser) {
      // Update
      const userRef = doc(firestore, 'users', selectedUser.id);
      updateDocumentNonBlocking(userRef, userData);
      toast({ title: "Usuário Atualizado", description: `As informações de ${userData.name} foram salvas.` });
    } else {
      // Create
      const newUserData = {
          ...userData,
          avatarUrl: `https://picsum.photos/seed/${Math.random()}/200/200`
      }
      addDocumentNonBlocking(collection(firestore, 'users'), newUserData);
      toast({ title: "Usuário Criado", description: `${userData.name} foi adicionado ao sistema.` });
    }
  };

  const handleDeleteUser = () => {
    if (!firestore || !selectedUser) return;
    const userRef = doc(firestore, 'users', selectedUser.id);
    deleteDocumentNonBlocking(userRef);
    toast({ title: "Usuário Excluído", description: `${selectedUser.name} foi removido do sistema.` });
    setIsAlertOpen(false);
    setSelectedUser(null);
  }

  const handleRoleChange = (user: User, newRole: 'Gestor' | 'Usuario') => {
    if (!firestore) return;
    const userRef = doc(firestore, 'users', user.id);
    updateDocumentNonBlocking(userRef, { role: newRole });
    toast({ 
        title: "Permissão Alterada", 
        description: `${user.name} agora é ${newRole}.` 
    });
  };

  const columns: ColumnDef<User>[] = React.useMemo(() => [
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
      accessorKey: "role",
      header: "Função",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
        const isCurrentUser = user.id === currentUser?.uid;

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
              <DropdownMenuItem onClick={() => {setSelectedUser(user); setIsFormOpen(true)}}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {user.role !== 'Gestor' && (
                <DropdownMenuItem disabled={isCurrentUser} onClick={() => handleRoleChange(user, 'Gestor')}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Promover a Gestor
                </DropdownMenuItem>
              )}
              {user.role === 'Gestor' && (
                <DropdownMenuItem disabled={isCurrentUser} onClick={() => handleRoleChange(user, 'Usuario')}>
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Revogar Gestor
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {setSelectedUser(user); setIsAlertOpen(true)}}
                disabled={isCurrentUser}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [currentUser?.uid]);

  const dataMemo = React.useMemo(() => users || [], [users]);

  const table = useReactTable({
    data: dataMemo,
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
    const h = setTimeout(() => {
      table.getColumn("email")?.setFilterValue(emailFilter);
    }, 300);
    return () => clearTimeout(h);
  }, [emailFilter, table]);

  return (
    <div>
       <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filtrar por e-mail..."
          value={emailFilter}
          onChange={(event) => setEmailFilter(event.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => {setSelectedUser(null); setIsFormOpen(true)}}>Adicionar Usuário</Button>
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
                  {isLoading ? "Carregando usuários..." : "Nenhum resultado."}
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
        <UserFormDialog 
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSave={handleSaveUser}
          user={selectedUser}
        />
      )}

      {isAlertOpen && (
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário "{selectedUser?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

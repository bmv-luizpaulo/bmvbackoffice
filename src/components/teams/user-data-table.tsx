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
import type { User, Role } from "@/lib/types";
import dynamic from "next/dynamic";
import { useAuth, useFirestore, useCollection, useUser as useAuthUser, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
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
import { useToast } from "@/hooks/use-toast"
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"

const UserFormDialog = dynamic(() => import('./user-form-dialog').then(m => m.UserFormDialog), { ssr: false });

export function UserDataTable() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user: currentUser } = useAuthUser();
  const { toast } = useToast();
  
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  const data = React.useMemo(() => usersData ?? [], [usersData]);

  const rolesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore]);
  const { data: rolesData, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);
  const rolesMap = React.useMemo(() => new Map(rolesData?.map(r => [r.id, r])), [rolesData]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  const isLoading = isLoadingUsers || isLoadingRoles;

  const handleEditClick = React.useCallback((user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  }, []);

  const handleDeleteClick = React.useCallback((user: User) => {
    setSelectedUser(user);
    setIsAlertOpen(true);
  }, []);

  const handleSaveUser = React.useCallback(async (userData: Omit<User, 'id' | 'avatarUrl'>) => {
    if (!firestore || !auth || !auth.currentUser) return;

    if (selectedUser) {
        // Update
        const userRef = doc(firestore, 'users', selectedUser.id);
        updateDocumentNonBlocking(userRef, userData);
        toast({ title: "Usuário Atualizado", description: `As informações de ${userData.name} foram salvas.` });
        setIsFormOpen(false);
    } else {
        // Create
        const adminUserEmail = auth.currentUser.email;
        const adminPassword = prompt("Para criar um novo usuário e enviar o link de definição de senha, por favor, confirme sua senha de Gestor:");

        if (!adminUserEmail || !adminPassword) {
            toast({ variant: 'destructive', title: "Ação cancelada", description: "Senha de gestor não fornecida." });
            return;
        }

        try {
            // A temporary, secure password for account creation. The user will never use it.
            const tempPassword = Math.random().toString(36).slice(-16);
            
            // 1. Create the new user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, tempPassword);
            const newUserId = userCredential.user.uid;

            // 2. Create the user profile in Firestore
            const newUserProfile = {
                ...userData,
                id: newUserId,
                avatarUrl: `https://picsum.photos/seed/${newUserId}/200`
            };
            await setDoc(doc(firestore, "users", newUserId), newUserProfile);
            
            // 3. Send password reset email for the user to set their own password
            await sendPasswordResetEmail(auth, userData.email);

            toast({ title: "Usuário Criado e Convite Enviado", description: `${userData.name} foi adicionado. Um e-mail foi enviado para que o usuário defina sua senha.` });
            setIsFormOpen(false);

        } catch (error: any) {
            console.error("Erro ao criar usuário:", error);
            const errorMessage = error.code === 'auth/email-already-in-use' 
                ? 'Este e-mail já está em uso por outra conta.' 
                : 'Ocorreu um erro ao criar o usuário. Verifique a senha do gestor e tente novamente.';
            toast({ variant: 'destructive', title: "Erro ao Criar Usuário", description: errorMessage });
        } finally {
            // Re-authenticate the admin user to keep their session active
            await signInWithEmailAndPassword(auth, adminUserEmail, adminPassword).catch(reauthError => {
                console.error("Erro ao reautenticar o gestor:", reauthError);
                toast({ variant: 'destructive', title: "Erro de Sessão", description: "Falha ao restaurar sua sessão. Por favor, faça login novamente." });
            });
        }
    }
  }, [firestore, auth, selectedUser, toast]);

  const handleDeleteUser = React.useCallback(() => {
    if (!firestore || !selectedUser) return;
    const userRef = doc(firestore, 'users', selectedUser.id);
    deleteDocumentNonBlocking(userRef);
    toast({ title: "Usuário Excluído", description: `${selectedUser.name} foi removido do sistema.` });
    setIsAlertOpen(false);
    setSelectedUser(null);
  }, [firestore, selectedUser, toast]);

  const handleRoleChange = React.useCallback((user: User, newRoleId: string) => {
    if (!firestore) return;
    const userRef = doc(firestore, 'users', user.id);
    updateDocumentNonBlocking(userRef, { roleId: newRoleId });
    const newRole = rolesMap.get(newRoleId);
    toast({ 
        title: "Cargo Alterado", 
        description: `${user.name} agora tem o cargo de ${newRole?.name}.` 
    });
  }, [firestore, toast, rolesMap]);

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
      accessorKey: "roleId",
      header: "Cargo",
      cell: ({ row }) => {
        const role = rolesMap.get(row.original.roleId || '');
        return role ? role.name : <span className="text-muted-foreground">Não definido</span>;
      }
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
              <DropdownMenuItem onClick={() => handleEditClick(user)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel>Alterar Cargo</DropdownMenuLabel>
              {rolesData?.map(role => (
                <DropdownMenuItem 
                  key={role.id}
                  disabled={isCurrentUser || user.roleId === role.id}
                  onClick={() => handleRoleChange(user, role.id)}
                >
                  {role.isManager ? <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> : <ShieldOff className="mr-2 h-4 w-4 text-muted-foreground" />}
                  {role.name}
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-red-600"
                onClick={() => handleDeleteClick(user)}
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
  ], [currentUser?.uid, handleRoleChange, handleEditClick, handleDeleteClick, rolesData, rolesMap]);

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
          placeholder="Filtrar por e-mail..."
          value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("email")?.setFilterValue(event.target.value)
          }
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

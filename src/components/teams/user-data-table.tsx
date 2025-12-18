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
  RowSelectionState,
} from "@tanstack/react-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, ShieldCheck, ShieldOff, Trash2, UserCheck, UserX, UserMinus, Eye, FileSpreadsheet, Copy, Link } from "lucide-react"

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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast"
import { createUserAction } from "@/lib/actions";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { ActivityLogger } from "@/lib/activity-logger";

const UserFormDialog = dynamic(() => import('./user-form-dialog').then(m => m.UserFormDialog), { ssr: false });
const UserProfileDialog = dynamic(() => import('./user-profile-dialog').then(m => m.UserProfileDialog), { ssr: false });
const UserImportExportDialog = dynamic(() => import('./user-import-export').then(m => m.UserImportExportDialog), { ssr: false });

export function UserDataTable() {
  const firestore = useFirestore();
  const { user: currentUser, isUserLoading: isAuthUserLoading } = useAuthUser();
  const { toast } = useToast();
  
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  const data = React.useMemo(() => usersData ?? [], [usersData]);

  const rolesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore]);
  const { data: rolesData, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);
  const rolesMap = React.useMemo(() => new Map(rolesData?.map(r => [r.id, r])), [rolesData]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = React.useState(false);
  const [generatedLink, setGeneratedLink] = React.useState<string | null>(null);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  const isLoading = isLoadingUsers || isLoadingRoles || isAuthUserLoading;

  const handleEditClick = React.useCallback((user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  }, []);

  const handleDeleteClick = React.useCallback((user: User) => {
    setSelectedUser(user);
    setIsAlertOpen(true);
  }, []);

  const handleViewProfileClick = React.useCallback((user: User) => {
    setSelectedUser(user);
    setIsProfileOpen(true);
  }, []);

  const handleSaveUser = React.useCallback(async (userData: Omit<User, 'id' | 'avatarUrl'>) => {
    if (!firestore || !currentUser) {
        toast({ variant: 'destructive', title: "Erro", description: "Serviços de autenticação não disponíveis." });
        return;
    }
    
    if (selectedUser) {
        // Update existing user
        const userRef = doc(firestore, 'users', selectedUser.id);
        await updateDocumentNonBlocking(userRef, userData);
        
        // Log activity
        await ActivityLogger.profileUpdate(firestore, selectedUser.id, currentUser.uid);
        
        toast({ title: "Usuário Atualizado", description: `As informações de ${userData.name} foram salvas.` });
    } else {
        // Create new user
        const result = await createUserAction(userData);
        if (result.success && result.data) {
            toast({ title: "Usuário Criado com Sucesso", description: `Um link para definição de senha foi gerado para ${userData.name}.` });
            setGeneratedLink(result.data.setupLink);
        } else {
            toast({ variant: 'destructive', title: "Erro ao Criar Usuário", description: result.error || "Ocorreu um erro desconhecido." });
        }
    }
    setIsFormOpen(false);

}, [firestore, selectedUser, currentUser, toast]);


  const handleDeleteUser = React.useCallback(() => {
    if (!firestore || !selectedUser) return;
    const userRef = doc(firestore, 'users', selectedUser.id);
    deleteDocumentNonBlocking(userRef);
    toast({ title: "Usuário Excluído", description: `${selectedUser.name} foi removido do sistema.` });
    setIsAlertOpen(false);
    setSelectedUser(null);
  }, [firestore, selectedUser, toast]);

  const handleRoleChange = React.useCallback(async (user: User, newRoleId: string) => {
    if (!firestore || !currentUser) return;
    const userRef = doc(firestore, 'users', user.id);
    await updateDocumentNonBlocking(userRef, { roleId: newRoleId });
    currentUser.getIdToken(true); // Force token refresh to get new claims
    const newRole = rolesMap.get(newRoleId);
    
    // Log activity
    await ActivityLogger.roleChange(firestore, user.id, newRole?.name || 'Cargo removido', currentUser.uid);
    
    toast({ 
        title: "Cargo Alterado", 
        description: `${user.name} agora tem o cargo de ${newRole?.name}.` 
    });
  }, [firestore, toast, rolesMap, currentUser]);

  const handleStatusChange = React.useCallback(async (user: User, newStatus: 'active' | 'inactive' | 'suspended') => {
    if (!firestore || !currentUser) return;
    const userRef = doc(firestore, 'users', user.id);
    await updateDocumentNonBlocking(userRef, { status: newStatus });
    const statusLabels = { active: 'Ativo', inactive: 'Inativo', suspended: 'Suspenso' };
    
    // Log activity
    await ActivityLogger.statusChange(firestore, user.id, statusLabels[newStatus], currentUser.uid);
    
    toast({ 
        title: "Status Alterado", 
        description: `${user.name} agora está ${statusLabels[newStatus]}.` 
    });
  }, [firestore, toast, currentUser]);

  const columns: ColumnDef<User>[] = React.useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Selecionar todos"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Selecionar linha"
          disabled={row.original.id === currentUser?.uid}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
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
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status || 'active';
        const statusConfig = {
          active: { label: 'Ativo', icon: UserCheck, className: 'text-green-600 bg-green-50 border-green-200' },
          inactive: { label: 'Inativo', icon: UserX, className: 'text-gray-600 bg-gray-50 border-gray-200' },
          suspended: { label: 'Suspenso', icon: UserMinus, className: 'text-red-600 bg-red-50 border-red-200' }
        };
        const config = statusConfig[status];
        const Icon = config.icon;
        return (
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.className}`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </div>
        );
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
              <DropdownMenuItem onClick={() => handleViewProfileClick(user)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Perfil
              </DropdownMenuItem>
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

              <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
              <DropdownMenuItem 
                disabled={isCurrentUser || user.status === 'active'}
                onClick={() => handleStatusChange(user, 'active')}
              >
                <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                Ativar
              </DropdownMenuItem>
              <DropdownMenuItem 
                disabled={isCurrentUser || user.status === 'inactive'}
                onClick={() => handleStatusChange(user, 'inactive')}
              >
                <UserX className="mr-2 h-4 w-4 text-gray-600" />
                Desativar
              </DropdownMenuItem>
              <DropdownMenuItem 
                disabled={isCurrentUser || user.status === 'suspended'}
                onClick={() => handleStatusChange(user, 'suspended')}
              >
                <UserMinus className="mr-2 h-4 w-4 text-red-600" />
                Suspender
              </DropdownMenuItem>

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
  ], [currentUser?.uid, handleRoleChange, handleStatusChange, handleViewProfileClick, handleEditClick, handleDeleteClick, rolesData, rolesMap]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    initialState: { pagination: { pageSize: 10 } },
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

  const handleBulkStatusChange = React.useCallback(async (newStatus: 'active' | 'inactive' | 'suspended') => {
    if (!firestore || !currentUser) return;
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedUsers = selectedRows.map(row => row.original);
    
    const statusLabels = { active: 'Ativo', inactive: 'Inativo', suspended: 'Suspenso' };
    
    for (const user of selectedUsers) {
      if (user.id !== currentUser?.uid) {
        const userRef = doc(firestore, 'users', user.id);
        await updateDocumentNonBlocking(userRef, { status: newStatus });
        
        // Log activity for each user
        await ActivityLogger.statusChange(firestore, user.id, statusLabels[newStatus], currentUser.uid);
      }
    }
    
    toast({ 
        title: "Status Alterado em Lote", 
        description: `${selectedUsers.length} usuários agora estão ${statusLabels[newStatus]}.` 
    });
    setRowSelection({});
  }, [firestore, toast, currentUser, table]);

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div>
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Input
            placeholder="Filtrar por e-mail..."
            value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("email")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <Select
            value={(table.getColumn("roleId")?.getFilterValue() as string) ?? ""}
            onValueChange={(value) =>
              table.getColumn("roleId")?.setFilterValue(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cargos</SelectItem>
              {rolesData?.map(role => (
                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={(table.getColumn("status")?.getFilterValue() as string) ?? ""}
            onValueChange={(value) =>
              table.getColumn("status")?.setFilterValue(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
              <SelectItem value="suspended">Suspenso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportExportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import/Export
          </Button>
          <Button onClick={() => {setSelectedUser(null); setIsFormOpen(true)}}>Adicionar Usuário</Button>
        </div>
      </div>
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md mb-4">
          <span className="text-sm font-medium">{selectedCount} usuário(s) selecionado(s)</span>
          <div className="flex gap-1 ml-auto">
            <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('active')}>
              <UserCheck className="h-4 w-4 mr-1" />
              Ativar
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('inactive')}>
              <UserX className="h-4 w-4 mr-1" />
              Desativar
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('suspended')}>
              <UserMinus className="h-4 w-4 mr-1" />
              Suspender
            </Button>
          </div>
        </div>
      )}
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

      <UserFormDialog 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSaveUser}
        user={selectedUser}
      />

      <UserProfileDialog
        isOpen={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        user={selectedUser}
      />

      <UserImportExportDialog
        isOpen={isImportExportOpen}
        onOpenChange={setIsImportExportOpen}
        users={data}
        roles={rolesData || []}
      />

       <Dialog open={!!generatedLink} onOpenChange={() => setGeneratedLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de Configuração de Senha</DialogTitle>
            <DialogDescription>
              Copie e envie este link para o novo usuário configurar sua senha e acessar a plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="link" className="sr-only">
                Link
              </Label>
              <Input
                id="link"
                defaultValue={generatedLink || ''}
                readOnly
              />
            </div>
            <Button type="submit" size="sm" className="px-3" onClick={() => {
                navigator.clipboard.writeText(generatedLink || '');
                toast({ title: 'Link copiado!' });
            }}>
              <span className="sr-only">Copy</span>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
           <DialogFooter className="sm:justify-start">
             <a
                href={`https://wa.me/?text=Olá! Para configurar sua senha de acesso ao nosso sistema, por favor, use o seguinte link: ${encodeURIComponent(generatedLink || '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
              <Button type="button" variant="secondary">
                Enviar por WhatsApp
              </Button>
            </a>
            <Button type="button" variant="outline" onClick={() => setGeneratedLink(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  )
}

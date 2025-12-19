
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
import { MoreHorizontal, Pencil, ShieldCheck, ShieldOff, Trash2, UserCheck, UserX, UserMinus, Eye, FileSpreadsheet, Copy, Link as LinkIcon, Mail, MessageSquare } from "lucide-react"

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
import { randomBytes } from "crypto";

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
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { ActivityLogger } from "@/lib/activity-logger";
import { updateUserRoleAction, updateUserStatusAction } from "@/lib/actions";
import { WhatsappIcon } from "../icons/whatsapp-icon";


const UserFormDialog = dynamic(() => import('./user-form-dialog').then(m => m.UserFormDialog), { ssr: false });
const UserProfileDialog = dynamic(() => import('./user-profile-dialog').then(m => m.UserProfileDialog), { ssr: false });
const UserImportExportDialog = dynamic(() => import('./user-import-export').then(m => m.UserImportExportDialog), { ssr: false });

type GeneratedCredentials = {
  email: string;
  tempPassword?: string;
  resetLink?: string;
};


export function UserDataTable() {
  const firestore = useFirestore();
  const auth = useAuth();
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
  const [generatedCredentials, setGeneratedCredentials] = React.useState<GeneratedCredentials | null>(null);
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
    if (!currentUser || !auth || !firestore) {
        toast({ variant: 'destructive', title: "Erro", description: "Serviços de autenticação não disponíveis." });
        return;
    }
    
    if (selectedUser) {
        // Update existing user
        const userRef = doc(firestore, 'users', selectedUser.id);
        const { email, ...updatableData } = userData;
        await updateDocumentNonBlocking(userRef, updatableData);
        
        await ActivityLogger.profileUpdate(firestore, selectedUser.id, currentUser.uid);
        
        toast({ title: "Usuário Atualizado", description: `As informações de ${userData.name} foram salvas.` });
    } else {
        // Create new user
        try {
            const token = await currentUser.getIdToken();
            const response = await fetch(`https://us-central1-studio-4461945520-252d9.cloudfunctions.net/createUser`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userData),
            });
            
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || `Falha ao chamar Cloud Function: ${response.statusText}`);
            }

            setGeneratedCredentials(result.data);
            
        } catch (error: any) {
            console.error("Erro ao chamar Cloud Function 'createUser':", error);
            toast({ variant: 'destructive', title: "Erro ao Criar Usuário", description: error.message });
        }
    }
    setIsFormOpen(false);

}, [firestore, selectedUser, currentUser, auth, toast]);


  const handleDeleteUser = React.useCallback(() => {
    if (!firestore || !selectedUser) return;
    const userRef = doc(firestore, 'users', selectedUser.id);
    deleteDocumentNonBlocking(userRef);
    toast({ title: "Usuário Excluído", description: `${selectedUser.name} foi removido do sistema.` });
    setIsAlertOpen(false);
    setSelectedUser(null);
  }, [firestore, selectedUser, toast]);

  const handleRoleChange = React.useCallback(async (user: User, newRoleId: string) => {
    if (!firestore) return;
    const result = await updateUserRoleAction(user.id, newRoleId);
    if (!result.success) {
        toast({ title: "Falha na Permissão", description: result.error, variant: 'destructive'});
        return;
    }

    const userRef = doc(firestore, 'users', user.id);
    await updateDocumentNonBlocking(userRef, { roleId: newRoleId });
    currentUser?.getIdToken(true); // Force token refresh to get new claims
    const newRole = rolesMap.get(newRoleId);
    
    if (currentUser?.uid) {
        await ActivityLogger.roleChange(firestore, user.id, newRole?.name || 'Cargo removido', currentUser.uid);
    }
    
    toast({ 
        title: "Cargo Alterado", 
        description: `${user.name} agora tem o cargo de ${newRole?.name}.` 
    });
  }, [firestore, toast, rolesMap, currentUser]);

  const handleStatusChange = React.useCallback(async (user: User, newStatus: 'active' | 'inactive' | 'suspended') => {
    if (!firestore || !currentUser) return;
    const result = await updateUserStatusAction(user.id, newStatus);
    if (!result.success) {
        toast({ title: "Falha na Permissão", description: result.error, variant: 'destructive'});
        return;
    }

    const userRef = doc(firestore, 'users', user.id);
    await updateDocumentNonBlocking(userRef, { status: newStatus });
    const statusLabels = { active: 'Ativo', inactive: 'Inativo', suspended: 'Suspenso' };
    
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
                  {role.permissions?.isManager ? <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> : <ShieldOff className="mr-2 h-4 w-4 text-muted-foreground" />}
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
  ], [currentUser, handleRoleChange, handleStatusChange, handleViewProfileClick, handleEditClick, handleDeleteClick, rolesData, rolesMap]);

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
            <SelectTrigger className="w-full sm:w-[180px]">
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
            <SelectTrigger className="w-full sm:w-[180px]">
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

       <GeneratedCredentialsDialog
          credentials={generatedCredentials}
          onOpenChange={() => setGeneratedCredentials(null)}
       />

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
              <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  )
}

function GeneratedCredentialsDialog({
  credentials,
  onOpenChange,
}: {
  credentials: GeneratedCredentials | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (!credentials) return;
    const text = `Email: ${credentials.email}\nSenha Temporária: ${credentials.tempPassword}\n\nFaça o primeiro login em: ${window.location.origin}/login\n\nLink para definir a senha: ${credentials.resetLink}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "As credenciais foram copiadas para a área de transferência." });
  };
  
  const handleWhatsapp = () => {
    if (!credentials) return;
    const message = `Olá! Seguem seus dados de acesso para o SGI:\n\n*Email:* ${credentials.email}\n*Senha Temporária:* ${credentials.tempPassword}\n\n*Acesse em:* ${window.location.origin}/login\n\n*Importante:* Use o link a seguir para definir sua senha pessoal: ${credentials.resetLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  }

  const handleEmail = () => {
    if (!credentials) return;
    const subject = "Seus dados de acesso ao SGI";
    const body = `
      <p>Olá,</p>
      <p>Sua conta no SGI (Sistema de Gestão Integrada) foi criada. Use os dados abaixo para seu primeiro acesso:</p>
      <p>
        <strong>Email:</strong> ${credentials.email}<br>
        <strong>Senha Temporária:</strong> ${credentials.tempPassword}
      </p>
      <p><strong>Acesse o sistema em:</strong> <a href="${window.location.origin}/login">${window.location.origin}/login</a></p>
      <p><strong>IMPORTANTE:</strong> Para sua segurança, por favor, defina sua senha pessoal através do link abaixo antes de fazer o login:</p>
      <p><a href="${credentials.resetLink}">Definir minha senha</a></p>
      <br>
      <p>Atenciosamente,</p>
      <p><strong>Equipe SGI</strong></p>
      <img src="https://firebasestorage.googleapis.com/v0/b/studio-4461945520-252d9.appspot.com/o/public%2FBMV.png?alt=media&token=48604313-a799-4b68-b800-e25f8c679a93" alt="Logo SGI" width="120">
    `;
    window.location.href = `mailto:${credentials.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  return (
    <Dialog open={!!credentials} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usuário Criado com Sucesso</DialogTitle>
          <DialogDescription>
            Use as opções abaixo para compartilhar as credenciais com o novo usuário.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" readOnly value={credentials?.email} />
          </div>
          <div>
            <Label htmlFor="password">Senha Temporária</Label>
            <Input id="password" readOnly value={credentials?.tempPassword} />
          </div>
           <div>
            <Label htmlFor="resetLink">Link para Definir Senha</Label>
            <Input id="resetLink" readOnly value={credentials?.resetLink} />
          </div>
        </div>
        <DialogFooter className="sm:justify-start gap-2">
            <Button onClick={handleCopy}><Copy className="mr-2 h-4 w-4"/>Copiar Tudo</Button>
            <Button onClick={handleWhatsapp} variant="outline"><WhatsappIcon className="mr-2 h-4 w-4"/>WhatsApp</Button>
            <Button onClick={handleEmail} variant="outline"><Mail className="mr-2 h-4 w-4"/>Email</Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="sm:ml-auto">Fechar</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


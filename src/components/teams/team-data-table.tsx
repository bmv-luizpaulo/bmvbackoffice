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
import type { Team, User } from "@/lib/types";
import dynamic from "next/dynamic";
import { useFirestore, useCollection } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
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

const TeamFormDialog = dynamic(() => import('./team-form-dialog').then(m => m.TeamFormDialog), { ssr: false });

export function TeamDataTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const teamsQuery = React.useMemo(() => firestore ? collection(firestore, 'teams') : null, [firestore]);
  const { data: teamsData, isLoading: isLoadingTeams } = useCollection<Team>(teamsQuery);
  
  const usersQuery = React.useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const data = React.useMemo(() => teamsData ?? [], [teamsData]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<Team | null>(null);
  
  const isLoading = isLoadingTeams || isLoadingUsers;

  const usersByTeam = React.useMemo(() => {
    if (!users || !teamsData) return new Map<string, User[]>();
    const map = new Map<string, User[]>();
    teamsData.forEach(team => map.set(team.id, []));
    users.forEach(user => {
        user.teamIds?.forEach(teamId => {
            if (map.has(teamId)) {
                map.get(teamId)!.push(user);
            }
        });
    });
    return map;
  }, [users, teamsData]);

  const handleEditClick = React.useCallback((team: Team) => {
    setSelectedTeam(team);
    setIsFormOpen(true);
  }, []);

  const handleDeleteClick = React.useCallback((team: Team) => {
    setSelectedTeam(team);
    setIsAlertOpen(true);
  }, []);

  const handleSaveTeam = React.useCallback(async (teamData: Omit<Team, 'id'>, memberIds: string[], teamId?: string) => {
    if (!firestore) return;

    let finalTeamId = teamId;

    if (finalTeamId) {
        const teamRef = doc(firestore, 'teams', finalTeamId);
        await updateDocumentNonBlocking(teamRef, teamData);
        toast({ title: "Equipe Atualizada", description: `A equipe "${teamData.name}" foi atualizada.` });
    } else {
        const docRef = await addDocumentNonBlocking(collection(firestore, 'teams'), teamData);
        finalTeamId = docRef.id;
        toast({ title: "Equipe Criada", description: `A equipe "${teamData.name}" foi criada com sucesso.` });
    }

    if (!finalTeamId || !users) return;

    const batch = writeBatch(firestore);
    const usersToUpdate = new Map<string, string[]>();

    // Determine which users need their teamIds array updated
    users.forEach(user => {
        const isMember = user.teamIds?.includes(finalTeamId!) || false;
        const shouldBeMember = memberIds.includes(user.id);

        if (isMember !== shouldBeMember) {
            const newTeamIds = shouldBeMember
                ? [...(user.teamIds || []), finalTeamId!]
                : user.teamIds!.filter(id => id !== finalTeamId);
            usersToUpdate.set(user.id, newTeamIds);
        }
    });

    if (usersToUpdate.size > 0) {
        usersToUpdate.forEach((newTeamIds, userId) => {
            const userRef = doc(firestore, 'users', userId);
            batch.update(userRef, { teamIds: newTeamIds });
        });
        await batch.commit();
        toast({ title: "Membros Atualizados", description: "As equipes dos usuários foram atualizadas." });
    }
  }, [firestore, toast, users]);


  const handleDeleteTeam = React.useCallback(async () => {
    if (!firestore || !selectedTeam || !users) return;
    
    // First, remove the teamId from all users that are members
    const batch = writeBatch(firestore);
    const members = users.filter(u => u.teamIds?.includes(selectedTeam.id));
    members.forEach(member => {
        const userRef = doc(firestore, 'users', member.id);
        const newTeamIds = member.teamIds?.filter(id => id !== selectedTeam.id);
        batch.update(userRef, { teamIds: newTeamIds });
    });
    await batch.commit();

    // Then, delete the team document
    const teamRef = doc(firestore, 'teams', selectedTeam.id);
    deleteDocumentNonBlocking(teamRef);
    
    toast({ title: "Equipe Excluída", description: `A equipe "${selectedTeam.name}" foi removida.`, variant: 'destructive' });
    setIsAlertOpen(false);
    setSelectedTeam(null);
  }, [firestore, selectedTeam, toast, users]);

  const columns: ColumnDef<Team>[] = React.useMemo(() => [
    {
      accessorKey: "name",
      header: "Nome da Equipe",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => <p className="text-muted-foreground max-w-xs truncate">{row.original.description}</p>
    },
    {
      id: "members",
      header: "Membros",
      cell: ({ row }) => {
        const team = row.original;
        const members = usersByTeam.get(team.id) || [];
        
        if (members.length === 0) {
            return <span className="text-muted-foreground text-xs">Sem membros</span>;
        }

        const displayMembers = members.slice(0, 3);
        const remainingCount = members.length - displayMembers.length;

        return (
            <div className="flex flex-col text-sm text-muted-foreground">
                {displayMembers.map(m => <span key={m.id} className="truncate">{m.name}</span>)}
                {remainingCount > 0 && <span className="text-xs font-medium">+ {remainingCount} outro(s)</span>}
            </div>
        );
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const team = row.original
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
                <DropdownMenuItem onClick={() => handleEditClick(team)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-500 focus:bg-red-50"
                  onClick={() => handleDeleteClick(team)}
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
  ], [usersByTeam, handleEditClick, handleDeleteClick]);

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
        <Button onClick={() => {setSelectedTeam(null); setIsFormOpen(true)}}>Adicionar Equipe</Button>
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
                  {isLoading ? "Carregando equipes..." : "Nenhuma equipe encontrada."}
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
        <TeamFormDialog 
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSave={(teamData, teamId) => handleSaveTeam(teamData, (isFormOpen && selectedTeam?.id) ? selectedTeam.id : undefined)}
          team={selectedTeam}
          users={users || []}
          usersInTeam={selectedTeam ? usersByTeam.get(selectedTeam.id) || [] : []}
        />
      )}

      {isAlertOpen && (
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente a equipe "{selectedTeam?.name}" e a removerá de todos os usuários.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedTeam(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTeam} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

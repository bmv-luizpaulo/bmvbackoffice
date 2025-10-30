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
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"

const TeamFormDialog = dynamic(() => import('./team-form-dialog').then(m => m.TeamFormDialog), { ssr: false });

export function TeamDataTable() {
  const firestore = useFirestore();
  const teamsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'teams') : null, [firestore]);
  const { data: teamsData, isLoading: isLoadingTeams } = useCollection<Team>(teamsCollection);
  const data = React.useMemo(() => teamsData ?? [], [teamsData]);

  const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersCollection);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<Team | null>(null);
  
  const isLoading = isLoadingTeams || isLoadingUsers;

  const usersByTeam = React.useMemo(() => {
    if (!users) return new Map<string, User[]>();

    const map = new Map<string, User[]>();
    users.forEach(user => {
        user.teamIds?.forEach(teamId => {
            if (!map.has(teamId)) {
                map.set(teamId, []);
            }
            map.get(teamId)!.push(user);
        });
    });
    return map;
  }, [users]);

  const handleEditClick = React.useCallback((team: Team) => {
    setSelectedTeam(team);
    setIsFormOpen(true);
  }, []);

  const handleDeleteClick = React.useCallback((team: Team) => {
    setSelectedTeam(team);
    setIsAlertOpen(true);
  }, []);

  const handleSaveTeam = React.useCallback((teamData: Omit<Team, 'id'>) => {
    if (!firestore) return;
    
    if (selectedTeam) {
      // Update
      const teamRef = doc(firestore, 'teams', selectedTeam.id);
      updateDocumentNonBlocking(teamRef, teamData);
    } else {
      // Create
      addDocumentNonBlocking(collection(firestore, 'teams'), teamData);
    }
  }, [firestore, selectedTeam]);

  const handleDeleteTeam = React.useCallback(() => {
    if (!firestore || !selectedTeam) return;
    const teamRef = doc(firestore, 'teams', selectedTeam.id);
    deleteDocumentNonBlocking(teamRef);
    setIsAlertOpen(false);
    setSelectedTeam(null);
  }, [firestore, selectedTeam]);

  const columns: ColumnDef<Team>[] = React.useMemo(() => [
    {
      accessorKey: "name",
      header: "Nome da Equipe",
    },
    {
      accessorKey: "description",
      header: "Descrição",
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

        return (
             <TooltipProvider>
                <div className="flex -space-x-2">
                    {members.slice(0, 5).map(member => (
                        <Tooltip key={member.id}>
                            <TooltipTrigger asChild>
                                <Avatar className="h-8 w-8 border-2 border-background">
                                    <AvatarImage src={member.avatarUrl} alt={member.name}/>
                                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{member.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                    {members.length > 5 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Avatar className="h-8 w-8 border-2 border-background">
                                    <AvatarFallback>+{members.length - 5}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{members.slice(5).map(m => m.name).join(', ')}</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </TooltipProvider>
        );
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const team = row.original
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
              <DropdownMenuItem onClick={() => handleEditClick(team)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => handleDeleteClick(team)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                  {isLoading ? "Carregando equipes..." : "Nenhum resultado."}
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
          onSave={handleSaveTeam}
          team={selectedTeam}
        />
      )}

      {isAlertOpen && (
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente a equipe "{selectedTeam?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedTeam(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTeam}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

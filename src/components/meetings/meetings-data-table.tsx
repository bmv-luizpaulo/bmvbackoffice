
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
import { MoreHorizontal, Pencil, Trash2, Video } from "lucide-react"

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
import type { Meeting, User } from "@/lib/types";
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
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { MeetingFormDialog } from './meeting-form-dialog';

export function MeetingsDataTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const meetingsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'meetings') : null, [firestore]);
  const { data: meetingsData, isLoading: isLoadingMeetings } = useCollection<Meeting>(meetingsQuery);

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  
  const usersMap = React.useMemo(() => new Map(usersData?.map(u => [u.id, u])), [usersData]);
  const data = React.useMemo(() => meetingsData ?? [], [meetingsData]);

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'dueDate', desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedMeeting, setSelectedMeeting] = React.useState<Meeting | null>(null);
  
  const isLoading = isLoadingMeetings || isLoadingUsers;

  const handleEditClick = React.useCallback((meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setIsFormOpen(true);
  }, []);

  const handleDeleteClick = React.useCallback((meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setIsAlertOpen(true);
  }, []);

  const handleSaveMeeting = React.useCallback(async (meetingData: Omit<Meeting, 'id' | 'createdAt'>, meetingId?: string) => {
    if (!firestore) return;

    if (meetingId) {
        await updateDocumentNonBlocking(doc(firestore, 'meetings', meetingId), meetingData);
        toast({ title: "Reunião Atualizada", description: "As informações da reunião foram salvas." });
    } else {
        await addDocumentNonBlocking(collection(firestore, 'meetings'), { ...meetingData, createdAt: new Date() });
        toast({ title: "Reunião Agendada", description: "A nova reunião foi adicionada ao calendário." });
    }
    setIsFormOpen(false);
  }, [firestore, toast]);


  const handleDeleteMeeting = React.useCallback(async () => {
    if (!firestore || !selectedMeeting) return;
    
    await deleteDocumentNonBlocking(doc(firestore, 'meetings', selectedMeeting.id));
    
    toast({ title: "Reunião Excluída", description: `A reunião "${selectedMeeting.name}" foi removida.`, variant: 'destructive' });
    setIsAlertOpen(false);
    setSelectedMeeting(null);
  }, [firestore, selectedMeeting, toast]);

  const columns: ColumnDef<Meeting>[] = React.useMemo(() => [
    {
      accessorKey: "name",
      header: "Assunto da Reunião",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "dueDate",
      header: "Data e Hora",
      cell: ({ row }) => format(new Date(row.original.dueDate), 'dd/MM/yyyy HH:mm')
    },
    {
        id: "participants",
        header: "Participantes",
        cell: ({ row }) => {
            const participants = row.original.participantIds.map(id => usersMap.get(id)).filter(Boolean);
            if (participants.length === 0) return <span className="text-muted-foreground text-xs">Nenhum participante</span>
            
            const displayMembers = participants.slice(0, 3);
            const remainingCount = participants.length - displayMembers.length;

            return (
                <div className="flex items-center -space-x-2">
                    {displayMembers.map(p => (
                        p && <Avatar key={p.id} className="h-7 w-7 border-2 border-background">
                            <AvatarImage src={p.avatarUrl} alt={p.name} />
                            <AvatarFallback>{p.name?.[0]}</AvatarFallback>
                        </Avatar>
                    ))}
                    {remainingCount > 0 && <Avatar className="h-7 w-7 border-2 border-background"><AvatarFallback>+{remainingCount}</AvatarFallback></Avatar>}
                </div>
            )
        }
    },
    {
      accessorKey: "meetLink",
      header: "Link",
      cell: ({ row }) => row.original.meetLink ? <a href={row.original.meetLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Acessar</a> : <span className="text-muted-foreground">N/A</span>
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const meeting = row.original
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
                <DropdownMenuItem onClick={() => handleEditClick(meeting)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-500 focus:bg-red-50"
                  onClick={() => handleDeleteClick(meeting)}
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
          placeholder="Filtrar por assunto..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Button onClick={() => {setSelectedMeeting(null); setIsFormOpen(true)}}>Agendar Reunião</Button>
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
                  {isLoading ? "Carregando reuniões..." : "Nenhuma reunião encontrada."}
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
        <MeetingFormDialog 
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSave={handleSaveMeeting}
          meeting={selectedMeeting}
          users={usersData || []}
        />
      )}

      {isAlertOpen && (
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente a reunião "{selectedMeeting?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedMeeting(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteMeeting} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

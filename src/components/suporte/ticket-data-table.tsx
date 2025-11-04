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
import { MoreHorizontal, Pencil, CheckCircle2, XCircle, Clock, Link as LinkIcon, HandCoins, LifeBuoy } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import type { Ticket, User, Role } from "@/lib/types";
import dynamic from "next/dynamic";
import { useFirestore, useCollection, useMemoFirebase, useUser as useAuthUser, useDoc } from "@/firebase";
import { collection, doc, query, where, serverTimestamp } from "firebase/firestore";
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
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useNotifications } from "../notifications/notifications-provider"

const TicketFormDialog = dynamic(() => import('./ticket-form-dialog').then(m => m.TicketFormDialog), { ssr: false });

export function TicketDataTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: authUser } = useAuthUser();
  const { createNotification } = useNotifications();
  
  const userProfileQuery = useMemoFirebase(() => firestore && authUser ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: userProfile } = useDoc<User>(userProfileQuery);
  const roleQuery = useMemoFirebase(() => firestore && userProfile?.roleId ? doc(firestore, 'roles', userProfile.roleId) : null, [firestore, userProfile?.roleId]);
  const { data: role } = useDoc<Role>(roleQuery);
  const isManager = role?.isManager || role?.isDev;

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    let q = collection(firestore, 'tickets');
    if (!isManager) {
        return query(q, where('requesterId', '==', authUser.uid));
    }
    return q;
  }, [firestore, authUser, isManager]);

  const { data: ticketsData, isLoading } = useCollection<Ticket>(ticketsQuery);
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData } = useCollection<User>(usersQuery);
  
  const usersMap = React.useMemo(() => new Map(usersData?.map(u => [u.id, u.name])), [usersData]);
  const data = React.useMemo(() => ticketsData ?? [], [ticketsData]);

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null);

  const handleEditClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsFormOpen(true);
  };
  
  const handleSaveTicket = async (ticketData: Omit<Ticket, 'id' | 'requesterId' | 'createdAt'>) => {
      if (!firestore || !authUser) return;

      if (selectedTicket) {
          const finalData = { ...ticketData, requesterId: selectedTicket.requesterId };
          await updateDocumentNonBlocking(doc(firestore, 'tickets', selectedTicket.id), finalData);
          toast({ title: "Ticket Atualizado", description: "Seu chamado foi atualizado." });
      } else {
          const finalData = { ...ticketData, requesterId: authUser.uid, createdAt: serverTimestamp() };
          const docRef = await addDocumentNonBlocking(collection(firestore, 'tickets'), finalData);
          toast({ title: "Chamado Aberto", description: "Sua solicitação foi enviada para a equipe de suporte." });

          // Notify managers if priority is high
          if (ticketData.priority === 'Alta') {
            const managerUsers = usersData?.filter(u => rolesMap.get(u.roleId || '')?.isManager);
            if (managerUsers) {
              managerUsers.forEach(manager => {
                if (manager.id !== authUser.uid) { // Don't notify the user who created the ticket
                  createNotification(manager.id, {
                    title: 'Chamado Urgente Aberto',
                    message: `Um novo chamado de alta prioridade foi aberto por ${userProfile?.name}: "${ticketData.title}"`,
                    link: `/suporte?ticketId=${docRef.id}`
                  });
                }
              });
            }
          }
      }
      setIsFormOpen(false);
  };

    const rolesMap = React.useMemo(() => new Map(usersData?.map(u => [u.id, u.roleId])), [usersData]);


  const handleStatusChange = async (ticket: Ticket, newStatus: 'Aberto' | 'Em Andamento' | 'Fechado') => {
      if (!firestore || !authUser) return;
      const dataToUpdate: Partial<Ticket> = {
          status: newStatus,
      };
      if (newStatus === 'Em Andamento' && !ticket.assigneeId) {
          dataToUpdate.assigneeId = authUser.uid;
      }
      await updateDocumentNonBlocking(doc(firestore, 'tickets', ticket.id), dataToUpdate);
      toast({ title: "Status Alterado", description: `O chamado foi marcado como "${newStatus}".` });
  }

  const columns: ColumnDef<Ticket>[] = React.useMemo(() => [
    {
      accessorKey: "title",
      header: "Título",
      cell: ({ row }) => <p className="font-medium max-w-xs truncate">{row.original.title}</p>
    },
    ...(isManager ? [{
        id: "requesterId",
        accessorKey: "requesterId",
        header: "Solicitante",
        cell: ({ row }: any) => usersMap.get(row.original.requesterId) || 'Desconhecido',
    }] : []),
    {
      accessorKey: "priority",
      header: "Prioridade",
      cell: ({ row }) => {
        const priority = row.original.priority;
        const variant = priority === 'Alta' ? 'destructive' : priority === 'Média' ? 'default' : 'secondary';
        const color = priority === 'Média' ? 'bg-amber-500' : '';
        return <Badge variant={variant} className={cn(color)}>{priority}</Badge>;
      }
    },
    {
      accessorKey: "createdAt",
      header: "Data de Abertura",
      cell: ({ row }) => row.original.createdAt ? format(new Date(row.original.createdAt?.toDate()), 'dd/MM/yyyy') : 'N/A'
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const variant = status === 'Fechado' ? 'default' : status === 'Aberto' ? 'outline' : 'secondary';
        const color = status === 'Fechado' ? 'bg-green-600' : '';
        return <Badge variant={variant} className={cn(color)}>{status}</Badge>;
      }
    },
     ...(isManager ? [{
        id: "assigneeId",
        accessorKey: "assigneeId",
        header: "Responsável",
        cell: ({ row }: any) => usersMap.get(row.original.assigneeId) || <span className='text-muted-foreground'>Não atribuído</span>,
    }] : []),
    {
      id: "actions",
      cell: ({ row }) => {
        const ticket = row.original;
        const canEdit = ticket.status === 'Aberto' && ticket.requesterId === authUser?.uid;
        const canManage = isManager && ticket.status !== 'Fechado';

        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                {canEdit && <DropdownMenuItem onClick={() => handleEditClick(ticket)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>}
                {canManage && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusChange(ticket, 'Em Andamento')}><Clock className="mr-2 h-4 w-4 text-amber-500"/>Atender</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(ticket, 'Fechado')}><CheckCircle2 className="mr-2 h-4 w-4 text-green-500"/>Fechar</DropdownMenuItem>
                    </>
                )}
                 {ticket.status === 'Fechado' && isManager && (
                    <DropdownMenuItem onClick={() => handleStatusChange(ticket, 'Aberto')}><Clock className="mr-2 h-4 w-4 text-blue-500"/>Reabrir</DropdownMenuItem>
                 )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ], [isManager, usersMap, authUser?.uid, handleStatusChange, handleEditClick]);

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
    state: { sorting, columnFilters },
  });

  return (
    <div>
       <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filtrar por título..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("title")?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => {setSelectedTicket(null); setIsFormOpen(true)}}>
          <LifeBuoy className="mr-2 h-4 w-4"/>
          Abrir Novo Chamado
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                    <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {isLoading ? "Carregando chamados..." : "Nenhum chamado encontrado."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Próximo</Button>
      </div>

      {isFormOpen && (
        <TicketFormDialog 
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSave={handleSaveTicket}
          ticket={selectedTicket}
        />
      )}
    </div>
  )
}

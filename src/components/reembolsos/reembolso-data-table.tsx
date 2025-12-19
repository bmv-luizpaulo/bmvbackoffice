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
import { MoreHorizontal, Pencil, CheckCircle2, XCircle, Clock, Link as LinkIcon, HandCoins } from "lucide-react"
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
import type { Reimbursement, User, Project } from "@/lib/types";
import dynamic from "next/dynamic";
import { useFirestore, useCollection, useMemoFirebase, useUser as useAuthUser, usePermissions } from "@/firebase";
import { collection, doc, query, where, serverTimestamp, or } from "firebase/firestore";
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
import { uploadReimbursementReceiptAction } from "@/lib/actions";

const ReembolsoFormDialog = dynamic(() => import('./reembolso-form-dialog').then(m => m.ReembolsoFormDialog), { ssr: false });

export function ReembolsoDataTable({ filterUserId }: { filterUserId?: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: authUser } = useAuthUser();
  const { ready: permissionsReady, isManager } = usePermissions();

  const reembolsosQuery = useMemoFirebase(() => {
    if (!firestore || !authUser || !permissionsReady) return null;
    let q = collection(firestore, 'reimbursements');
    
    if (filterUserId) {
        if (!filterUserId) return null;
        return query(q, where('requesterId', '==', filterUserId));
    }
    
    if (!isManager) {
        return query(q, where('requesterId', '==', authUser.uid));
    }
    return q;
  }, [firestore, authUser, isManager, filterUserId, permissionsReady]);

  const { data: reembolsosData, isLoading } = useCollection<Reimbursement>(reembolsosQuery);
  
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData } = useCollection<User>(usersQuery);

  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser || !permissionsReady) return null;
    const projectsCollection = collection(firestore, 'projects');
    if (isManager) {
        return projectsCollection;
    }
    return query(
        projectsCollection,
        or(
            where('ownerId', '==', authUser.uid),
            where('teamMembers', 'array-contains', authUser.uid)
        )
    );
  }, [firestore, authUser, permissionsReady, isManager]);
  const { data: projectsData } = useCollection<Project>(projectsQuery);
  
  const usersMap = React.useMemo(() => new Map(usersData?.map(u => [u.id, u.name])), [usersData]);
  const [statusFilter, setStatusFilter] = React.useState<'Todos' | 'Pendente' | 'Aprovado' | 'Recusado'>('Todos');
  const [dateFrom, setDateFrom] = React.useState<string>('');
  const [dateTo, setDateTo] = React.useState<string>('');

  const filteredData = React.useMemo(() => {
    const items = reembolsosData ?? [];
    return items.filter(r => {
      const statusOk = statusFilter === 'Todos' ? true : r.status === statusFilter;
      let dateOk = true;
      const reqDate = r.requestDate?.toDate ? r.requestDate.toDate() : (r.requestDate ? new Date(r.requestDate) : null);
      if (dateFrom && reqDate) {
        dateOk = dateOk && reqDate >= new Date(dateFrom + 'T00:00:00');
      }
      if (dateTo && reqDate) {
        dateOk = dateOk && reqDate <= new Date(dateTo + 'T23:59:59');
      }
      return statusOk && dateOk;
    });
  }, [reembolsosData, statusFilter, dateFrom, dateTo]);

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'requestDate', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedReimbursement, setSelectedReimbursement] = React.useState<Reimbursement | null>(null);
  const [isRejectOpen, setIsRejectOpen] = React.useState(false);
  const [rejectComment, setRejectComment] = React.useState('');
  const [reimbursementToReject, setReimbursementToReject] = React.useState<Reimbursement | null>(null);

  const handleEditClick = (reimbursement: Reimbursement) => {
    setSelectedReimbursement(reimbursement);
    setIsFormOpen(true);
  };
  
  const handleSaveReimbursement = async (reimbursementData: Omit<Reimbursement, 'id' | 'requesterId'>, receiptFile?: File) => {
      if (!firestore || !authUser) return;

      let receiptUrl = selectedReimbursement?.receiptUrl;
      if (receiptFile) {
          const formData = new FormData();
          formData.append('file', receiptFile);
          const result = await uploadReimbursementReceiptAction(formData);
          if (result.success && result.data?.url) {
              receiptUrl = result.data.url;
          } else {
              toast({ title: "Erro no Upload", description: result.error, variant: 'destructive' });
              return;
          }
      }

      if (selectedReimbursement) {
          const finalData = { ...reimbursementData, receiptUrl: receiptUrl || '', requesterId: selectedReimbursement.requesterId };
          await updateDocumentNonBlocking(doc(firestore, 'reimbursements', selectedReimbursement.id), finalData);
          toast({ title: "Reembolso Atualizado", description: "Sua solicitação foi atualizada." });
      } else {
          const finalData = { ...reimbursementData, receiptUrl: receiptUrl || '', requesterId: authUser.uid, requestDate: serverTimestamp() };
          await addDocumentNonBlocking(collection(firestore, 'reimbursements'), finalData);
          toast({ title: "Reembolso Solicitado", description: "Sua solicitação foi enviada para aprovação." });
      }
      setIsFormOpen(false);
  };

  const handleStatusChange = async (reimbursement: Reimbursement, newStatus: 'Aprovado' | 'Recusado', comment?: string) => {
      if (!firestore || !authUser) return;
      const dataToUpdate = {
          status: newStatus,
          approverId: authUser.uid,
          decisionDate: serverTimestamp(),
          notes: newStatus === 'Recusado' ? (comment || '') : (reimbursement.notes || '')
      };
      await updateDocumentNonBlocking(doc(firestore, 'reimbursements', reimbursement.id), dataToUpdate);
      toast({ title: "Status Alterado", description: `A solicitação foi marcada como ${newStatus.toLowerCase()}.` });
  }

  const columns: ColumnDef<Reimbursement>[] = React.useMemo(() => [
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => <p className="font-medium max-w-xs truncate">{row.original.description}</p>
    },
    ...(isManager && !filterUserId ? [{
        id: "requesterId",
        accessorKey: "requesterId",
        header: "Solicitante",
        cell: ({ row }: any) => usersMap.get(row.original.requesterId) || 'Desconhecido',
    }] : []),
    {
      accessorKey: "amount",
      header: "Valor",
      cell: ({ row }) => `R$ ${row.original.amount.toFixed(2)}`
    },
    {
      accessorKey: "requestDate",
      header: "Data da Solicitação",
      cell: ({ row }) => row.original.requestDate ? format(new Date(row.original.requestDate.toDate()), 'dd/MM/yyyy') : 'N/A'
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const variant = status === 'Aprovado' ? 'default' : status === 'Recusado' ? 'destructive' : 'secondary';
        const color = status === 'Aprovado' ? 'bg-green-600' : '';
        return <Badge variant={variant} className={cn(color)}>{status}</Badge>;
      }
    },
    {
      accessorKey: "notes",
      header: "Motivo",
      cell: ({ row }) => {
        const n = row.original.notes;
        const show = row.original.status === 'Recusado' && n && n.trim().length > 0;
        return show ? (
          <span className="text-sm" title={n}>{n.length > 30 ? n.slice(0, 30) + '…' : n}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const reimbursement = row.original;
        const canEdit = reimbursement.status === 'Pendente' && reimbursement.requesterId === authUser?.uid;
        const canApprove = isManager && reimbursement.status === 'Pendente';

        return (
          <div className="flex items-center justify-end gap-2">
            {reimbursement.receiptUrl && (
              <a href={reimbursement.receiptUrl} target="_blank" rel="noopener noreferrer" aria-label="Ver comprovante">
                <Button variant="ghost" size="icon"><LinkIcon className="h-4 w-4"/></Button>
              </a>
            )}
            {canEdit && (
              <Button variant="ghost" size="icon" onClick={() => handleEditClick(reimbursement)} aria-label="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canApprove && (
              <>
                <Button variant="ghost" size="icon" onClick={() => handleStatusChange(reimbursement, 'Aprovado')} aria-label="Aprovar">
                  <CheckCircle2 className="h-4 w-4 text-green-500"/>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setReimbursementToReject(reimbursement); setRejectComment(''); setIsRejectOpen(true); }}
                  aria-label="Recusar"
                >
                  <XCircle className="h-4 w-4 text-red-500"/>
                </Button>
              </>
            )}
          </div>
        )
      },
    },
  ], [isManager, usersMap, authUser?.uid, handleStatusChange, handleEditClick, filterUserId]);

  const table = useReactTable({
    data: filteredData,
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

  const handleExportCsv = () => {
    const rows = table.getRowModel().rows;
    const header = ['Descrição','Solicitante','Valor','Data da Solicitação','Status'];
    const lines = rows.map(r => {
      const it = r.original as Reimbursement;
      const desc = '"' + (it.description || '').replace(/"/g, '""') + '"';
      const requester = usersMap.get(it.requesterId) || '';
      const amount = (it.amount ?? 0).toFixed(2).replace('.', ',');
      const date = it.requestDate ? format(new Date(it.requestDate.toDate()), 'dd/MM/yyyy') : '';
      const status = it.status;
      return [desc, requester, amount, date, status].join(';');
    });
    const content = [header.join(';'), ...lines].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reembolsos.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
       <div className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Filtrar por descrição..."
            value={(table.getColumn("description")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("description")?.setFilterValue(event.target.value)}
            className="max-w-sm"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="Todos">Todos</option>
            <option value="Pendente">Pendente</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Recusado">Recusado</option>
          </select>
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm"/>
            <span className="text-muted-foreground text-sm">até</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm"/>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCsv}>Exportar CSV</Button>
          <Button onClick={() => {setSelectedReimbursement(null); setIsFormOpen(true)}}>
            <HandCoins className="mr-2 h-4 w-4"/>
            Nova Solicitação
          </Button>
        </div>
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
                  {isLoading ? "Carregando reembolsos..." : "Nenhuma solicitação encontrada."}
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
        <ReembolsoFormDialog 
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSave={handleSaveReimbursement}
          reimbursement={selectedReimbursement}
          projects={projectsData || []}
        />
      )}

      <AlertDialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recusar Reembolso</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, informe o motivo da recusa. Esta informação ficará registrada na solicitação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo</label>
            <textarea
              className="w-full rounded-md border bg-background p-2 text-sm min-h-[100px]"
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Descreva o motivo da recusa..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!rejectComment.trim() || !reimbursementToReject}
              onClick={() => {
                if (reimbursementToReject && rejectComment.trim()) {
                  handleStatusChange(reimbursementToReject, 'Recusado', rejectComment.trim());
                }
                setIsRejectOpen(false);
              }}
            >
              Confirmar Recusa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

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
import type { Reimbursement, User, Role } from "@/lib/types";
import dynamic from "next/dynamic";
import { useFirestore, useCollection, useMemoFirebase, useUser as useAuthUser } from "@/firebase";
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
import { uploadReimbursementReceiptAction } from "@/lib/actions";

const ReembolsoFormDialog = dynamic(() => import('./reembolso-form-dialog').then(m => m.ReembolsoFormDialog), { ssr: false });

export function ReembolsoDataTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: authUser } = useAuthUser();
  
  const userProfileQuery = useMemoFirebase(() => firestore && authUser ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: userProfile } = useCollection<User>(userProfileQuery as any); // useCollection for single doc for simplicity here
  const roleId = userProfile?.[0]?.roleId;

  const roleQuery = useMemoFirebase(() => firestore && roleId ? doc(firestore, 'roles', roleId) : null, [firestore, roleId]);
  const { data: roleData } = useCollection<Role>(roleQuery as any);
  const isManager = roleData?.[0]?.isManager;

  const reembolsosQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    let q = collection(firestore, 'reimbursements');
    if (!isManager) {
        return query(q, where('requesterId', '==', authUser.uid));
    }
    return q;
  }, [firestore, authUser, isManager]);

  const { data: reembolsosData, isLoading } = useCollection<Reimbursement>(reembolsosQuery);
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData } = useCollection<User>(usersQuery);
  
  const usersMap = React.useMemo(() => new Map(usersData?.map(u => [u.id, u.name])), [usersData]);
  const data = React.useMemo(() => reembolsosData ?? [], [reembolsosData]);

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'requestDate', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedReimbursement, setSelectedReimbursement] = React.useState<Reimbursement | null>(null);

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

  const handleStatusChange = async (reimbursement: Reimbursement, newStatus: 'Aprovado' | 'Recusado') => {
      if (!firestore || !authUser) return;
      const dataToUpdate = {
          status: newStatus,
          approverId: authUser.uid,
          decisionDate: serverTimestamp()
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
    ...(isManager ? [{
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
      id: "actions",
      cell: ({ row }) => {
        const reimbursement = row.original;
        const canEdit = reimbursement.status === 'Pendente' && reimbursement.requesterId === authUser?.uid;
        const canApprove = isManager && reimbursement.status === 'Pendente';

        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                {reimbursement.receiptUrl && <a href={reimbursement.receiptUrl} target="_blank" rel="noopener noreferrer"><DropdownMenuItem><LinkIcon className="mr-2 h-4 w-4"/>Ver Comprovante</DropdownMenuItem></a>}
                {canEdit && <DropdownMenuItem onClick={() => handleEditClick(reimbursement)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>}
                {canApprove && <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleStatusChange(reimbursement, 'Aprovado')}><CheckCircle2 className="mr-2 h-4 w-4 text-green-500"/>Aprovar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(reimbursement, 'Recusado')}><XCircle className="mr-2 h-4 w-4 text-red-500"/>Recusar</DropdownMenuItem>
                </>}
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
          placeholder="Filtrar por descrição..."
          value={(table.getColumn("description")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("description")?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => {setSelectedReimbursement(null); setIsFormOpen(true)}}>
          <HandCoins className="mr-2 h-4 w-4"/>
          Nova Solicitação
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
        />
      )}
    </div>
  )
}

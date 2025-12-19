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
import { MoreHorizontal, Trash2, CheckCircle2, AlertCircle, Eye } from "lucide-react"
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
import type { ErrorLog, User, NotificationTemplate } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast"
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { Badge } from "../ui/badge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { ScrollArea } from "../ui/scroll-area"

interface ErrorLogViewerProps {
    filterResolved: boolean;
}

export function ErrorLogViewer({ filterResolved }: ErrorLogViewerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const errorLogsQuery = useMemoFirebase(() => 
    firestore 
    ? query(collection(firestore, 'errorLogs'), where('isResolved', '==', filterResolved)) 
    : null, 
  [firestore, filterResolved]);

  const { data: errorLogsData, isLoading: isLoadingLogs } = useCollection<ErrorLog>(errorLogsQuery);

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  
  const usersMap = React.useMemo(() => new Map(usersData?.map(u => [u.id, u.name])), [usersData]);
  const data = React.useMemo(() => errorLogsData ?? [], [errorLogsData]);

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'timestamp', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const isLoading = isLoadingLogs || isLoadingUsers;

  const handleStatusChange = async (log: ErrorLog, isResolved: boolean) => {
    if (!firestore) return;
    const logRef = doc(firestore, 'errorLogs', log.id);
    await updateDocumentNonBlocking(logRef, { isResolved });
    toast({ title: "Status do Erro Atualizado", description: `O erro ${log.errorCode} foi marcado como ${isResolved ? 'resolvido' : 'não resolvido'}.` });
  };
  
  const handleDelete = async (logId: string) => {
    if (!firestore) return;
    const logRef = doc(firestore, 'errorLogs', logId);
    await deleteDocumentNonBlocking(logRef);
    toast({ title: "Log de Erro Excluído", variant: 'destructive' });
  }

  const columns: ColumnDef<ErrorLog>[] = React.useMemo(() => [
    {
      accessorKey: "isResolved",
      header: "Status",
      cell: ({ row }) => (
        row.original.isResolved 
          ? <Badge variant="default" className="bg-green-600">Resolvido</Badge>
          : <Badge variant="destructive">Não Resolvido</Badge>
      )
    },
    {
      accessorKey: "errorCode",
      header: "Código",
      cell: ({ row }) => <span className="font-mono">{row.original.errorCode}</span>
    },
    {
      accessorKey: "errorMessage",
      header: "Mensagem",
      cell: ({ row }) => <p className="max-w-xs truncate">{row.original.errorMessage}</p>
    },
    {
      accessorKey: "pageUrl",
      header: "URL",
       cell: ({ row }) => <p className="max-w-xs truncate text-muted-foreground">{row.original.pageUrl}</p>
    },
    {
      accessorKey: "userId",
      header: "Usuário",
      cell: ({ row }) => usersMap.get(row.original.userId) || <span className="text-muted-foreground">{row.original.userId}</span>
    },
    {
      accessorKey: "timestamp",
      header: "Data",
      cell: ({ row }) => row.original.timestamp ? format(new Date(row.original.timestamp.toDate()), 'dd/MM/yy HH:mm', { locale: ptBR }) : 'N/A'
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const log = row.original
        return (
            <Dialog>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DialogTrigger asChild>
                            <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />Ver Detalhes</DropdownMenuItem>
                        </DialogTrigger>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusChange(log, !log.isResolved)}>
                            {log.isResolved ? <AlertCircle className="mr-2 h-4 w-4"/> : <CheckCircle2 className="mr-2 h-4 w-4"/>}
                            Marcar como {log.isResolved ? 'Não Resolvido' : 'Resolvido'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(log.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Erro: {row.original.errorCode}</DialogTitle>
                        <DialogDescription>
                            Informações técnicas completas sobre o erro capturado.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] pr-4">
                        <div className="space-y-4 font-mono text-xs">
                             <div>
                                <h4 className="font-bold mb-1 text-sm text-foreground">Mensagem de Erro</h4>
                                <pre className="p-3 bg-muted rounded-md text-destructive whitespace-pre-wrap">{row.original.errorMessage}</pre>
                            </div>
                             <div>
                                <h4 className="font-bold mb-1 text-sm text-foreground">Stack do Erro</h4>
                                <pre className="p-3 bg-muted rounded-md max-h-48 overflow-y-auto">{row.original.errorStack}</pre>
                            </div>
                            <div>
                                <h4 className="font-bold mb-1 text-sm text-foreground">Stack de Componentes</h4>
                                <pre className="p-3 bg-muted rounded-md max-h-48 overflow-y-auto">{row.original.componentStack}</pre>
                            </div>
                             <div>
                                <h4 className="font-bold mb-1 text-sm text-foreground">Contexto</h4>
                                <pre className="p-3 bg-muted rounded-md whitespace-pre-wrap">{JSON.stringify({ user: usersMap.get(row.original.userId) || row.original.userId, url: row.original.pageUrl, userAgent: row.original.userAgent }, null, 2)}</pre>
                            </div>
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        )
      },
    },
  ], [usersMap, handleStatusChange, handleDelete]);

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
          placeholder="Filtrar por mensagem de erro..."
          value={(table.getColumn("errorMessage")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("errorMessage")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
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
                  {isLoading ? "Carregando logs..." : "Nenhum log de erro encontrado."}
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
    </div>
  )
}

'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Check, X, MessageSquare, CheckSquare, Loader2, AlertTriangle, Clock } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { ChecklistExecution, Team, User as UserType } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  getExpandedRowModel,
  ExpandedState,
} from "@tanstack/react-table"
import { format, formatDistanceStrict } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';


export default function ExecutedChecklistsPage() {
  const firestore = useFirestore();
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'executedAt', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  
  const executionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'checklistExecutions'), orderBy('executedAt', 'desc')) : null, [firestore]);
  const { data: executions, isLoading: isLoadingExecutions } = useCollection<ChecklistExecution>(executionsQuery);
  
  const teamsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'teams') : null, [firestore]);
  const { data: teams } = useCollection<Team>(teamsQuery);
  const teamsMap = React.useMemo(() => new Map(teams?.map(t => [t.id, t.name])), [teams]);
  
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users } = useCollection<UserType>(usersQuery);
  const usersMap = React.useMemo(() => new Map(users?.map(u => [u.id, u.name])), [users]);

  const data = React.useMemo(() => executions || [], [executions]);

  const columns: ColumnDef<ChecklistExecution>[] = React.useMemo(() => [
    {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => {
            return row.getCanExpand() ? (
            <Button
                variant="ghost" size="icon"
                onClick={row.getToggleExpandedHandler()}
                className='h-6 w-6'
            >
                {row.getIsExpanded() ? '−' : '+'}
            </Button>
            ) : null
        },
    },
    {
      accessorKey: 'checklistName',
      header: 'Nome do Checklist',
    },
    {
      accessorKey: 'teamId',
      header: 'Equipe',
       cell: ({ row }) => teamsMap.get(row.original.teamId) || 'N/A',
    },
    {
      accessorKey: 'executedBy',
      header: 'Executado Por',
      cell: ({ row }) => usersMap.get(row.original.executedBy) || 'N/A',
    },
    {
      accessorKey: 'executedAt',
      header: 'Data da Execução',
      cell: ({ row }) => format(new Date(row.original.executedAt.toDate()), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    },
     {
      id: 'progress',
      header: 'Progresso',
      cell: ({ row }) => {
        const items = row.original.items;
        const completableItems = items.filter(i => i.type === 'item' || i.type === 'yes_no');
        const completedItems = completableItems.filter(i => (i.type === 'item' && i.isCompleted) || (i.type === 'yes_no' && i.answer !== 'unanswered')).length;
        const progress = completableItems.length > 0 ? (completedItems / completableItems.length) * 100 : 0;
        return (
          <div className="flex items-center gap-2">
            <Progress value={progress} className="w-24" />
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
        )
      }
    },
    {
      id: 'executionTime',
      header: 'Tempo de Execução',
      cell: ({ row }) => {
        if (!row.original.createdAt) return <span className="text-muted-foreground text-xs">N/A</span>;
        const startTime = new Date(row.original.createdAt.toDate());
        const endTime = new Date(row.original.executedAt.toDate());
        return <span className="text-sm font-medium">{formatDistanceStrict(endTime, startTime, { locale: ptBR, unit: 'minute' })}</span>
      }
    }
  ], [teamsMap, usersMap]);


  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, expanded },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  const renderSubComponent = ({ row }: { row: any }) => {
    const items = row.original.items.sort((a: any, b: any) => a.order - b.order);
    return (
        <div className="p-4 bg-muted/50">
             <h4 className="font-bold mb-2">Detalhes da Execução</h4>
             <div className="space-y-3">
                 {items.map((item: any) => {
                      if (item.type === 'header') {
                        return (
                            <div key={item.id} className="font-semibold text-sm bg-background p-2 rounded-md mt-2">{item.description}</div>
                        )
                      }
                      if (item.type === 'item') {
                         return (
                            <div key={item.id} className="flex items-center gap-2 p-2 bg-background rounded-md text-sm">
                               <CheckSquare className={cn("h-4 w-4", item.isCompleted ? 'text-green-600' : 'text-gray-300')} />
                               <span className={cn(item.isCompleted && "line-through text-muted-foreground")}>{item.description}</span>
                            </div>
                         )
                      }
                      if (item.type === 'yes_no') {
                        return (
                             <div key={item.id} className="flex flex-col gap-1 p-2 bg-background rounded-md text-sm">
                                <div className="flex items-center gap-2">
                                    {item.answer === 'yes' && <Check className='h-4 w-4 text-green-600'/>}
                                    {item.answer === 'no' && <X className='h-4 w-4 text-red-600'/>}
                                    {item.answer === 'unanswered' && <AlertTriangle className='h-4 w-4 text-amber-500'/>}
                                    <span>{item.description}</span>
                                </div>
                                {item.comment && (
                                     <div className='flex items-start gap-2 text-gray-600 pl-6'>
                                        <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                                        <p className='italic text-xs'>"{item.comment}"</p>
                                    </div>
                                )}
                            </div>
                        )
                      }
                      return null;
                 })}
             </div>
        </div>
    )
}

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
          <History className="h-8 w-8 text-primary" />
          Checklists Realizados
        </h1>
        <p className="text-muted-foreground">
          Visualize o histórico de todos os checklists que foram preenchidos.
        </p>
      </header>
        
      <Card>
        <CardHeader>
            <CardTitle>Histórico de Execuções</CardTitle>
            <CardDescription>Clique em uma linha para ver os detalhes de cada checklist preenchido.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                        ))}
                    </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {isLoadingExecutions ? (
                        <TableRow><TableCell colSpan={columns.length} className="h-24 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                    ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                        <React.Fragment key={row.id}>
                            <TableRow data-state={row.getIsSelected() && "selected"}>
                                {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                                ))}
                            </TableRow>
                             {row.getIsExpanded() && (
                                <TableRow>
                                    <TableCell colSpan={columns.length}>
                                        {renderSubComponent({ row })}
                                    </TableCell>
                                </TableRow>
                            )}
                        </React.Fragment>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">Nenhum checklist realizado encontrado.</TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
             <div className="flex items-center justify-end space-x-2 py-4">
                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Próximo</Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

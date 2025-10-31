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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Task, Project, User } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase, useUser as useAuthUser } from "@/firebase";
import { collectionGroup, query, where } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function CompletedTasksPage() {
  const firestore = useFirestore();
  const { user: authUser } = useAuthUser();

  const tasksQuery = useMemoFirebase(
    () => firestore ? query(
        collectionGroup(firestore, 'tasks'), 
        where('isCompleted', '==', true)
    ) : null,
    [firestore]
  );
  
  const { data: tasksData, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
  const projectsQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'projects') : null, [firestore]);
  const { data: projectsData, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const projectsMap = React.useMemo(() => new Map(projectsData?.map(p => [p.id, p.name])), [projectsData]);
  const usersMap = React.useMemo(() => new Map(usersData?.map(u => [u.id, u.name])), [usersData]);

  const data = React.useMemo(() => tasksData ?? [], [tasksData]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const isLoading = isLoadingTasks || isLoadingProjects || isLoadingUsers;

  const columns: ColumnDef<Task>[] = React.useMemo(() => [
    {
      accessorKey: "name",
      header: "Nome da Tarefa",
    },
    {
      accessorKey: "projectId",
      header: "Projeto",
      cell: ({ row }) => projectsMap.get(row.original.projectId) || 'N/D',
    },
    {
      accessorKey: "assigneeId",
      header: "Responsável",
       cell: ({ row }) => usersMap.get(row.original.assigneeId || '') || 'N/D',
    },
    {
      accessorKey: "dueDate",
      header: "Data de Conclusão",
      cell: ({ row }) => row.original.dueDate ? format(new Date(row.original.dueDate), 'dd/MM/yyyy') : 'N/D',
    },
  ], [projectsMap, usersMap]);

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
    <div className="space-y-6">
       <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-primary"/>
            Tarefas Concluídas
        </h1>
        <p className="text-muted-foreground">
          Visualize o histórico de todas as tarefas que foram finalizadas.
        </p>
      </header>
       <Card>
        <CardHeader>
          <CardTitle>Histórico de Conclusão</CardTitle>
          <CardDescription>
            Use a busca para filtrar por nome, projeto ou responsável.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-between py-4">
                <Input
                placeholder="Filtrar tarefas..."
                value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                    table.getColumn("name")?.setFilterValue(event.target.value)
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
                        {isLoading ? "Carregando tarefas..." : "Nenhuma tarefa concluída encontrada."}
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
        </CardContent>
      </Card>
    </div>
  )
}

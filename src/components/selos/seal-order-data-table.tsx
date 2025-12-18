
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
import type { SealOrder } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from "../ui/badge"

export function SealOrderDataTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const sealOrdersQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'sealOrders'), orderBy('orderDate', 'desc')) : null, 
    [firestore]
  );

  const { data: sealOrdersData, isLoading } = useCollection<SealOrder>(sealOrdersQuery);
  const data = React.useMemo(() => sealOrdersData ?? [], [sealOrdersData]);

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'orderDate', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const columns: ColumnDef<SealOrder>[] = React.useMemo(() => [
    {
      accessorKey: "legacyId",
      header: "Pedido",
      cell: ({ row }) => <span className="font-mono text-primary">#{row.original.legacyId}</span>,
    },
    {
      accessorKey: "orderDate",
      header: "Data",
      cell: ({ row }) => row.original.orderDate ? format(new Date(row.original.orderDate.toDate()), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
    },
    {
      accessorKey: "originName",
      header: "Origem",
       cell: ({ row }) => (
        <div>
            <div className="font-medium">{row.original.originName}</div>
            <div className="text-xs text-muted-foreground">{row.original.originDocument}</div>
        </div>
       )
    },
    {
      accessorKey: "program",
      header: "Parc/Prog",
    },
    {
      accessorKey: "uf",
      header: "UF",
    },
    {
      accessorKey: "quantity",
      header: "Quantidade",
      cell: ({ row }) => `${row.original.quantity} ucs`
    },
     {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => `R$ ${row.original.total.toFixed(2)}`
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge>{row.original.status}</Badge>
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 20 } },
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div>
       <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filtrar por nome da origem..."
          value={(table.getColumn("originName")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("originName")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Button disabled>Sincronizar NXT</Button>
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
                  {isLoading ? `Carregando pedidos...` : "Nenhum pedido encontrado."}
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
    </div>
  )
}

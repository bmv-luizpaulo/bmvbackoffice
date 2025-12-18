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
import { MoreHorizontal, Upload, User as UserIcon, Archive } from "lucide-react"

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
import type { SealOrder, Contact } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from "../ui/badge"
import dynamic from "next/dynamic"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { ContactProfileDialog } from "../agenda/contact-profile-dialog";
import { ContactFormDialog } from "../agenda/contact-form-dialog";

const SealOrderImportDialog = dynamic(() => import('./seal-order-import-dialog').then(m => m.SealOrderImportDialog), { ssr: false });

interface SealOrderDataTableProps {
  statusFilter: 'active' | 'archived';
}

export function SealOrderDataTable({ statusFilter }: SealOrderDataTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const sealOrdersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const baseQuery = collection(firestore, 'sealOrders');
    const nonArchivedStatuses = ["Pendente de Aprovação", "Pendente de Pagamento", "Pag. Efetuados", "Pré-processados", "Processados", "Falhas", "Negados", "Vai Renovar", "Em Tratativa", "Não Tem Interesse"];

    if (statusFilter === 'archived') {
      return query(baseQuery, where('status', '==', 'Arquivado'), orderBy('orderDate', 'desc'));
    }
    // Para a aba "ativa", pegamos tudo que NÃO é "Arquivado".
    return query(baseQuery, where('status', 'in', nonArchivedStatuses), orderBy('orderDate', 'desc'));
  }, [firestore, statusFilter]);

  const { data: sealOrdersData, isLoading } = useCollection<SealOrder>(sealOrdersQuery);
  const data = React.useMemo(() => sealOrdersData ?? [], [sealOrdersData]);
  
  const contactsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'contacts') : null, [firestore]);
  const { data: contacts } = useCollection<Contact>(contactsQuery);
  const contactsMapByDoc = React.useMemo(() => {
    if (!contacts) return new Map<string, Contact>();
    return new Map(contacts.map(c => [c.documento, c]));
  }, [contacts]);
  
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'orderDate', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [isContactProfileOpen, setIsContactProfileOpen] = React.useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = React.useState(false);
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);
  const [prefilledContact, setPrefilledContact] = React.useState<Partial<Contact> | null>(null);

  const handleImportSave = async (orders: Partial<SealOrder>[]) => {
    if (!firestore) return;
    let successCount = 0;
    for (const order of orders) {
        try {
            await addDocumentNonBlocking(collection(firestore, 'sealOrders'), order);
            successCount++;
        } catch (e) {
            console.error("Error importing order row: ", e);
        }
    }
    if (successCount > 0) {
        toast({
            title: "Importação Concluída",
            description: `${successCount} de ${orders.length} pedidos foram importados com sucesso.`
        });
    }
    setIsImportOpen(false);
  };
  
  const handleContactClick = (order: SealOrder) => {
    const contactByDoc = contactsMapByDoc.get(order.originDocument || '');
    if (contactByDoc) {
      setSelectedContact(contactByDoc);
      setIsContactProfileOpen(true);
      return;
    }
  
    if (contacts && order.originName) {
      const searchName = order.originName.toLowerCase().trim();
      const contactByName = contacts.find(c => {
        const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().trim();
        return fullName.includes(searchName) || searchName.includes(fullName);
      });
  
      if (contactByName) {
        setSelectedContact(contactByName);
        setIsContactProfileOpen(true);
        return;
      }
    }
  
    const nameParts = order.originName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    setPrefilledContact({
        firstName: firstName,
        lastName: lastName,
        documento: order.originDocument || '',
        tipoDocumento: (order.originDocument || '').length > 14 ? 'CNPJ' : 'CPF',
    });
    setIsContactFormOpen(true);
  };
  
  const handleSaveNewContact = async (contactData: Omit<Contact, 'id'>) => {
    if (!firestore) return;
    await addDocumentNonBlocking(collection(firestore, 'contacts'), { ...contactData, createdAt: new Date() });
    toast({ title: "Contato Criado", description: "O novo contato foi adicionado." });
    setIsContactFormOpen(false);
    setPrefilledContact(null);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: SealOrder['status']) => {
    if (!firestore) return;
    await updateDocumentNonBlocking(doc(firestore, 'sealOrders', orderId), { status: newStatus });
    toast({ title: 'Status do Pedido Atualizado', description: `O pedido foi marcado como "${newStatus}".` });
  };


  const columns: ColumnDef<SealOrder>[] = React.useMemo(() => [
    {
      accessorKey: "legacyId",
      header: "Pedido",
      cell: ({ row }) => <span className="font-mono text-primary">#{row.original.legacyId}</span>,
    },
    {
      accessorKey: "orderDate",
      header: "Data",
      cell: ({ row }) => {
        const orderDate = row.original.orderDate;
        if (!orderDate) return <span className="text-muted-foreground">N/D</span>;

        let date: Date | null = null;
        if (orderDate?.toDate) {
            date = orderDate.toDate();
        } else if (typeof orderDate === 'object' && 'y' in orderDate && 'm' in orderDate && 'd' in orderDate) {
            date = new Date(orderDate.y, (orderDate.m - 1), orderDate.d, orderDate.H || 0, orderDate.M || 0, orderDate.S || 0);
        } else if (typeof orderDate === 'string') {
            date = new Date(orderDate);
        }
        
        if (!date || !isValid(date)) {
            return <span className="text-destructive">Data inválida</span>
        }

        return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
      },
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
     {
      id: "actions",
      cell: ({ row }) => {
        const order = row.original;
        const currentStatus = order.status;
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
                <DropdownMenuItem onClick={() => handleContactClick(order)}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  Ver Contato
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
                <DropdownMenuItem disabled={currentStatus === 'Vai Renovar'} onClick={() => handleStatusUpdate(order.id, 'Vai Renovar')}>Vai Renovar</DropdownMenuItem>
                <DropdownMenuItem disabled={currentStatus === 'Em Tratativa'} onClick={() => handleStatusUpdate(order.id, 'Em Tratativa')}>Em Tratativa</DropdownMenuItem>
                <DropdownMenuItem disabled={currentStatus === 'Não Tem Interesse'} onClick={() => handleStatusUpdate(order.id, 'Não Tem Interesse')}>Não Tem Interesse</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-amber-600" onClick={() => handleStatusUpdate(order.id, 'Arquivado')}>
                  <Archive className="mr-2 h-4 w-4" />
                  Arquivar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    }
  ], [contactsMapByDoc, contacts, handleContactClick]);

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
        <Button onClick={() => setIsImportOpen(true)}>
          <Upload className="h-4 w-4 mr-2"/>
          Importar Pedidos
        </Button>
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

       <SealOrderImportDialog 
        isOpen={isImportOpen}
        onOpenChange={setIsImportOpen}
        onSave={handleImportSave}
      />
      
      {isContactProfileOpen && (
          <ContactProfileDialog 
            isOpen={isContactProfileOpen}
            onOpenChange={setIsContactProfileOpen}
            contact={selectedContact}
          />
      )}
      
      {isContactFormOpen && (
          <ContactFormDialog
            isOpen={isContactFormOpen}
            onOpenChange={setIsContactFormOpen}
            onSave={handleSaveNewContact}
            contact={prefilledContact as Contact}
            type="cliente"
          />
      )}
    </div>
  )
}

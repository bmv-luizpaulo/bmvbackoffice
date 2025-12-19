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
  VisibilityState,
} from "@tanstack/react-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2, History, FileText, Wrench } from "lucide-react"

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
import type { Asset, User } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase, useUser as useAuthUser } from "@/firebase";
import { collection, doc, serverTimestamp, query, where } from "firebase/firestore";
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
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import dynamic from "next/dynamic";
import { format, differenceInDays, isPast } from "date-fns";
import Link from "next/link";
import { useNotifications } from "../notifications/notifications-provider";
import { useVirtualizer } from "@tanstack/react-virtual";

const AssetFormDialog = dynamic(() => import('./asset-form-dialog').then(m => m.AssetFormDialog), { ssr: false });
const AssetHistoryDialog = dynamic(() => import('./asset-history-dialog').then(m => m.AssetHistoryDialog), { ssr: false });

interface AssetDataTableProps {
  ownerFilter?: string | null;
}

export const AssetDataTable = React.memo(function AssetDataTable({ ownerFilter }: AssetDataTableProps) {
  const firestore = useFirestore();
  const { user: authUser } = useAuthUser();
  const { toast } = useToast();
  const { createNotification } = useNotifications();

  const assetsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    let q = collection(firestore, 'assets');
    if (ownerFilter === 'me') {
      if (!authUser.uid) return null; // Aguarda o UID estar disponível
      return query(q, where('assigneeId', '==', authUser.uid));
    }
    return q;
  }, [firestore, authUser, ownerFilter]);

  const { data: assetsData, isLoading: isLoadingAssets } = useCollection<Asset>(assetsQuery);
  
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const usersMap = React.useMemo(() => new Map(usersData?.map(u => [u.id, u.name])), [usersData]);
  const data = React.useMemo(() => assetsData ?? [], [assetsData]);

  // Advanced filters
  const [statusFilter, setStatusFilter] = React.useState<string>('Todos');
  const [typeFilter, setTypeFilter] = React.useState<string>('Todos');
  const [responsibleFilter, setResponsibleFilter] = React.useState<string>('Todos');
  const [locationFilter, setLocationFilter] = React.useState<string>('');
  const [next30Only, setNext30Only] = React.useState<boolean>(false);

  const uniqueStatuses = React.useMemo(() => {
    const set = new Set<string>();
    data.forEach(a => a.status && set.add(a.status));
    return ['Todos', ...Array.from(set)];
  }, [data]);
  const uniqueTypes = React.useMemo(() => {
    const set = new Set<string>();
    data.forEach(a => a.type && set.add(a.type));
    return ['Todos', ...Array.from(set)];
  }, [data]);
  const uniqueResponsibles = React.useMemo(() => {
    const set = new Set<string>();
    data.forEach(a => a.assigneeId && set.add(a.assigneeId));
    return ['Todos', ...Array.from(set)];
  }, [data]);

  const filteredData = React.useMemo(() => {
    return data.filter(a => {
      const statusOk = statusFilter === 'Todos' ? true : a.status === statusFilter;
      const typeOk = typeFilter === 'Todos' ? true : a.type === typeFilter;
      const respOk = responsibleFilter === 'Todos' ? true : a.assigneeId === responsibleFilter;
      const locOk = locationFilter.trim() ? (a.location || '').toLowerCase().includes(locationFilter.toLowerCase()) : true;
      let nextOk = true;
      if (next30Only) {
        if (!a.nextMaintenanceDate) nextOk = false;
        else {
          const d = new Date(a.nextMaintenanceDate);
          const diff = differenceInDays(d, new Date());
          nextOk = diff >= 0 && diff <= 30; // próximas 30 dias
        }
      }
      return statusOk && typeOk && respOk && locOk && nextOk;
    });
  }, [data, statusFilter, typeFilter, responsibleFilter, locationFilter, next30Only]);

  // KPI counts
  const { inUse, inMaintenance, available } = React.useMemo(() => {
    const s = { inUse: 0, inMaintenance: 0, available: 0 };
    data.forEach(a => {
      if (a.status === 'Em Uso') s.inUse++;
      else if (a.status === 'Em Manutenção') s.inMaintenance++;
      else if (a.status === 'Disponível') s.available++;
    });
    return s;
  }, [data]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({} as Record<string, boolean>);
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [importRows, setImportRows] = React.useState<Partial<Asset>[]>([]);
  const [importError, setImportError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isTransferOpen, setIsTransferOpen] = React.useState(false);
  const [transferUserId, setTransferUserId] = React.useState<string>('');
  const [transferSearch, setTransferSearch] = React.useState<string>('');
  const [transferTargets, setTransferTargets] = React.useState<Asset[]>([]);

  const isLoading = isLoadingAssets || isLoadingUsers;

  const logHistory = React.useCallback(async (assetId: string, event: string, details: Record<string, any> = {}) => {
      if (!firestore || !authUser) return;
      const historyCollection = collection(firestore, 'assets', assetId, 'history');
      await addDocumentNonBlocking(historyCollection, {
        assetId,
        event,
        details,
        actorId: authUser.uid,
        timestamp: serverTimestamp(),
      });
  }, [firestore, authUser]);

  const handleEditClick = React.useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormOpen(true);
  }, []);
  
  const handleHistoryClick = React.useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setIsHistoryOpen(true);
  }, []);

  const handleDeleteClick = React.useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setIsAlertOpen(true);
  }, []);

  const handleSaveAsset = React.useCallback(async (assetData: Omit<Asset, 'id'>, assetId?: string) => {
    if (!firestore) return;
    
    if (assetId) {
      const assetRef = doc(firestore, 'assets', assetId);
      const originalAsset = assetsData?.find(a => a.id === assetId);

      await updateDocumentNonBlocking(assetRef, assetData);

      if (originalAsset?.assigneeId !== assetData.assigneeId) {
          await logHistory(assetId, 'Atribuição Alterada', { 
            from: usersMap.get(originalAsset?.assigneeId || '') || 'Ninguém', 
            to: usersMap.get(assetData.assigneeId || '') || 'Ninguém'
          });
          if (assetData.assigneeId) {
             createNotification(assetData.assigneeId, 'asset_assigned', { assetName: assetData.name });
          }
      }
      toast({ title: "Ativo Atualizado", description: "O ativo foi atualizado com sucesso." });
    } else {
      const newDocRef = await addDocumentNonBlocking(collection(firestore, 'assets'), assetData);
      await logHistory(newDocRef.id, 'Ativo Criado');
      if (assetData.assigneeId) {
          await logHistory(newDocRef.id, 'Atribuição Inicial', { to: usersMap.get(assetData.assigneeId) || 'N/A' });
          createNotification(assetData.assigneeId, 'asset_assigned', { assetName: assetData.name });
      }
      toast({ title: "Ativo Adicionado", description: "O novo ativo foi cadastrado." });
    }
  }, [firestore, toast, assetsData, logHistory, usersMap, createNotification]);

  const handleDeleteAsset = React.useCallback(async () => {
    if (!firestore || !selectedAsset) return;
    // Log deletion before actually deleting
    await logHistory(selectedAsset.id, 'Ativo Excluído');
    const assetRef = doc(firestore, 'assets', selectedAsset.id);
    deleteDocumentNonBlocking(assetRef);
    toast({ title: "Ativo Excluído", description: "O ativo foi removido do sistema." });
    setIsAlertOpen(false);
    setSelectedAsset(null);
  }, [firestore, selectedAsset, toast, logHistory]);
  
  const handleAddNewClick = React.useCallback(() => {
    setSelectedAsset(null);
    setIsFormOpen(true);
  }, []);

  const handleImportClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const parseDateFlexible = (value?: string) => {
    if (!value) return undefined;
    const v = value.trim();
    if (!v) return undefined;
    // Accept dd/MM/yyyy or ISO
    const parts = v.split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts.map(Number);
      if (!isNaN(dd) && !isNaN(mm) && !isNaN(yyyy)) {
        return new Date(yyyy, mm - 1, dd).toISOString();
      }
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  };

  const handleFileSelected = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) throw new Error('CSV vazio');
        const header = lines[0].split(';').map(h => h.trim());
        const idx = (name: string) => header.findIndex(h => h.toLowerCase() === name.toLowerCase());
        const iName = idx('name');
        const iType = idx('type');
        const iStatus = idx('status');
        const iAssigneeId = idx('assigneeId');
        const iLocation = idx('location');
        const iNext = idx('nextMaintenanceDate');
        if (iName === -1) throw new Error('Cabeçalho deve conter a coluna "name"');
        const rows: Partial<Asset>[] = lines.slice(1).map(line => {
          const cols = line.split(';');
          const get = (i: number) => (i >= 0 && i < cols.length ? cols[i].replace(/^"|"$/g, '') : '').trim();
          return {
            name: get(iName),
            type: iType >= 0 ? get(iType) as any : undefined,
            status: iStatus >= 0 ? get(iStatus) as any : undefined,
            assigneeId: iAssigneeId >= 0 ? get(iAssigneeId) : undefined,
            location: iLocation >= 0 ? get(iLocation) : undefined,
            nextMaintenanceDate: iNext >= 0 ? parseDateFlexible(get(iNext)) : undefined,
          } as Partial<Asset>;
        }).filter(r => r.name && r.name.length > 0);
        setImportRows(rows);
        setImportError(null);
        setIsImportOpen(true);
      } catch (err: any) {
        setImportError(err?.message || 'Falha ao ler CSV');
        setImportRows([]);
        setIsImportOpen(true);
      }
    };
    reader.readAsText(file, 'utf-8');
    // reset input
    e.target.value = '';
  }, []);

  const handleConfirmImport = React.useCallback(async () => {
    if (!firestore || importRows.length === 0) { setIsImportOpen(false); return; }
    for (const row of importRows) {
      await addDocumentNonBlocking(collection(firestore, 'assets'), row as any);
    }
    toast({ title: 'Importação concluída', description: `${importRows.length} ativo(s) importado(s).` });
    setIsImportOpen(false);
    setImportRows([]);
  }, [firestore, importRows, toast]);

  const columns: ColumnDef<Asset>[] = React.useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="Selecionar todos"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(e.currentTarget.checked)}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label="Selecionar linha"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect?.()}
          onChange={(e) => row.toggleSelected(e.currentTarget.checked)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Nome do Ativo",
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => <Badge variant="outline">{row.original.type}</Badge>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>
    },
    {
      accessorKey: "assigneeId",
      header: "Responsável",
      cell: ({ row }) => usersMap.get(row.original.assigneeId || '') || <span className="text-muted-foreground">N/A</span>,
    },
    {
      accessorKey: "location",
      header: "Localização",
    },
    {
        accessorKey: "nextMaintenanceDate",
        header: "Próxima Manutenção",
        cell: ({ row }) => {
          const d = row.original.nextMaintenanceDate ? new Date(row.original.nextMaintenanceDate) : null;
          if (!d) return <span className="text-muted-foreground">N/A</span>;
          const overdue = isPast(d) && differenceInDays(new Date(), d) > 0;
          const days = Math.abs(differenceInDays(d, new Date()));
          const isSoon = !overdue && days <= 30;
          const dateText = format(d, 'dd/MM/yyyy');
          if (overdue) return <span className="text-red-600 font-medium" title={`Vencida há ${days} dias`}>{dateText} • Vencida</span>;
          if (isSoon) return <span className="text-amber-600 font-medium" title={`Em ${days} dias`}>{dateText} •  ≤30d</span>;
          return <span>{dateText}</span>;
        },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const asset = row.original
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
              <DropdownMenuItem onClick={() => handleEditClick(asset)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleHistoryClick(asset)}>
                <History className="mr-2 h-4 w-4" />
                Ver Histórico
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openSingleTransfer(asset)}>
                <Pencil className="mr-2 h-4 w-4" />
                Transferir Responsável
              </DropdownMenuItem>
              <Link href={`/assets/contract/new?assetId=${asset.id}`}>
                <DropdownMenuItem>
                  <FileText className="mr-2 h-4 w-4" />
                  Criar Contrato de Uso
                </DropdownMenuItem>
              </Link>
              <Link href={`/maintenance?assetId=${asset.id}`}>
                <DropdownMenuItem>
                  <Wrench className="mr-2 h-4 w-4" />
                  Nova Manutenção
                </DropdownMenuItem>
              </Link>
              {asset.assigneeId && (
                <Link href={`/reports/asset-delivery/${asset.id}`} target="_blank">
                  <DropdownMenuItem>
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar Termo de Entrega
                  </DropdownMenuItem>
                </Link>
              )}
              {asset.assigneeId && (
                <Link href={`/reports/asset-return/${asset.id}`} target="_blank">
                  <DropdownMenuItem>
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar Termo de Devolução
                  </DropdownMenuItem>
                </Link>
              )}
              {asset.assigneeId && (
                <Link href={`/reports/promissory-note/${asset.id}`} target="_blank">
                  <DropdownMenuItem>
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar Nota Promissória
                  </DropdownMenuItem>
                </Link>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => handleDeleteClick(asset)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [usersMap, handleEditClick, handleDeleteClick, handleHistoryClick]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    initialState: { pagination: { pageSize: 10 } },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection
    },
  });

  // Bulk actions
  const selectedRows = table.getSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  const handleExportCsv = React.useCallback(() => {
    const rows = (hasSelection ? selectedRows : table.getRowModel().rows);
    const header = ['Nome','Tipo','Status','Responsável','Localização','Próxima Manutenção'];
    const lines = rows.map(r => {
      const a = r.original as Asset;
      const name = '"' + (a.name || '').replace(/"/g, '""') + '"';
      const type = a.type || '';
      const status = a.status || '';
      const resp = usersMap.get(a.assigneeId || '') || '';
      const loc = '"' + ((a.location || '').replace(/"/g, '""')) + '"';
      const date = a.nextMaintenanceDate ? format(new Date(a.nextMaintenanceDate), 'dd/MM/yyyy') : '';
      return [name,type,status,resp,loc,date].join(';');
    });
    const content = [header.join(';'), ...lines].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = hasSelection ? 'ativos-selecionados.csv' : 'ativos.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [table, selectedRows, usersMap, hasSelection]);

  const applyBulkUpdate = React.useCallback(async (updates: Partial<Asset>) => {
    if (!firestore) return;
    const targets = selectedRows.map(r => r.original as Asset);
    for (const asset of targets) {
      const ref = doc(firestore, 'assets', asset.id);
      await updateDocumentNonBlocking(ref, updates);
    }
    toast({ title: 'Alterações aplicadas', description: `${targets.length} ativo(s) atualizado(s).` });
  }, [firestore, selectedRows, toast]);

  const handleBulkChangeStatus = React.useCallback(async () => {
    const value = window.prompt('Novo status (Em Uso, Em Manutenção, Disponível):');
    if (!value) return;
    await applyBulkUpdate({ status: value as any });
  }, [applyBulkUpdate]);

  const handleBulkChangeLocation = React.useCallback(async () => {
    const value = window.prompt('Nova localização:');
    if (value === null) return;
    await applyBulkUpdate({ location: value });
  }, [applyBulkUpdate]);

  const handleBulkAssignResponsible = React.useCallback(() => {
    // open dialog with selected assets
    const targets = selectedRows.map(r => r.original as Asset);
    setTransferTargets(targets);
    setTransferUserId('');
    setTransferSearch('');
    setIsTransferOpen(true);
  }, [selectedRows]);

  const openSingleTransfer = React.useCallback((asset: Asset) => {
    setTransferTargets([asset]);
    setTransferUserId('');
    setTransferSearch('');
    setIsTransferOpen(true);
  }, []);

  const handleConfirmTransfer = React.useCallback(async () => {
    if (!firestore) return;
    const uid = transferUserId || undefined;
    for (const asset of transferTargets) {
      const ref = doc(firestore, 'assets', asset.id);
      await updateDocumentNonBlocking(ref, { assigneeId: uid });
      await logHistory(asset.id, 'Atribuição Alterada', { 
        from: usersMap.get(asset.assigneeId || '') || 'Ninguém',
        to: usersMap.get(uid || '') || (uid ? uid : 'Ninguém'),
      });
      if (uid) {
        createNotification(uid, 'asset_assigned', { assetName: asset.name });
      }
    }
    toast({ title: 'Transferência concluída', description: `${transferTargets.length} ativo(s) atualizado(s).` });
    setIsTransferOpen(false);
    setTransferTargets([]);
  }, [firestore, transferUserId, transferTargets, usersMap, logHistory, createNotification, toast]);
  
  const parentRef = React.useRef<HTMLDivElement>(null);
  const filteredUsers = React.useMemo(() => {
    if (!usersData) return [];
    if (!transferSearch.trim()) return usersData;
    const q = transferSearch.toLowerCase();
    return usersData.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [usersData, transferSearch]);
  
  const rowVirtualizer = useVirtualizer({
    count: filteredUsers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  return (
    <div>
      {/* KPI header */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Em Uso</p>
          <p className="text-2xl font-bold">{inUse}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Em Manutenção</p>
          <p className="text-2xl font-bold">{inMaintenance}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Disponível</p>
          <p className="text-2xl font-bold">{available}</p>
        </div>
      </div>

       <div className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Filtrar por nome..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
              {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={responsibleFilter} onChange={(e) => setResponsibleFilter(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
              {uniqueResponsibles.map(id => <option key={id} value={id}>{id === 'Todos' ? 'Todos' : (usersMap.get(id) || 'Sem responsável')}</option>)}
            </select>
            <Input
              placeholder="Localização..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-40"
            />
        </div>
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto">
                    Colunas
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {table
                    .getAllColumns()
                    .filter(
                        (column) => column.getCanHide()
                    )
                    .map((column) => {
                        return (
                        <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                            }
                        >
                            {column.id === 'name' ? 'Nome' : 
                             column.id === 'type' ? 'Tipo' :
                             column.id === 'status' ? 'Status' :
                             column.id === 'assigneeId' ? 'Responsável' :
                             column.id === 'location' ? 'Localização' :
                             column.id === 'nextMaintenanceDate' ? 'Próx. Manutenção' :
                             column.id
                            }
                        </DropdownMenuCheckboxItem>
                        )
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center gap-2 mr-2">
              <input id="next30" type="checkbox" className="h-4 w-4" checked={next30Only} onChange={(e) => setNext30Only(e.target.checked)} />
              <label htmlFor="next30" className="text-sm">Próximas 30 dias</label>
            </div>
            <Button variant="outline" onClick={handleExportCsv} disabled={!data.length}>Exportar CSV</Button>
            <Button variant="outline" onClick={handleImportClick}>Importar CSV</Button>
            <Button onClick={handleAddNewClick}>Adicionar Ativo</Button>
        </div>
      </div>
      {hasSelection && (
         <div className="flex flex-wrap items-center gap-2 rounded-md border p-3 mb-3">
           <span className="text-sm">{selectedRows.length} selecionado(s)</span>
           <Button variant="outline" onClick={handleBulkChangeStatus}>Alterar Status</Button>
           <Button variant="outline" onClick={handleBulkChangeLocation}>Mudar Localização</Button>
           <Button variant="outline" onClick={handleBulkAssignResponsible}>Atribuir Responsável</Button>
           <Button variant="outline" onClick={handleExportCsv}>Exportar Seleção</Button>
         </div>
       )}
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
                <TableCell colSpan={columns.length} className="h-32">
                  <div className="flex h-full w-full items-center justify-center">
                    {isLoading ? (
                      <span>Carregando ativos...</span>
                    ) : (
                      <div className="text-center space-y-2">
                        <p className="text-muted-foreground">Nenhum ativo encontrado.</p>
                        <div className="flex items-center justify-center gap-2">
                          <Button onClick={handleAddNewClick}>Adicionar Ativo</Button>
                          <Button variant="outline" onClick={handleImportClick}>Importar CSV</Button>
                        </div>
                      </div>
                    )}
                  </div>
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

      {isFormOpen && <AssetFormDialog 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSaveAsset}
        asset={selectedAsset}
        users={usersData || []}
      />}

      {isHistoryOpen && <AssetHistoryDialog
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        asset={selectedAsset}
        usersMap={new Map(usersData?.map(u => [u.id, u as any]) || [])}
      />}
      
      {isAlertOpen && <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente o ativo "{selectedAsset?.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSelectedAsset(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAsset} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>}

      {/* Hidden file input for CSV */}
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelected} />

      {/* Import preview dialog */}
      <AlertDialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar CSV de Ativos</AlertDialogTitle>
            <AlertDialogDescription>
              Esperado cabeçalho: name;type;status;assigneeId;location;nextMaintenanceDate (dd/MM/yyyy ou ISO).
            </AlertDialogDescription>
          </AlertDialogHeader>
          {importError ? (
            <div className="text-red-600 text-sm">{importError}</div>
          ) : (
            <div className="max-h-64 overflow-auto text-sm border rounded-md p-2 bg-muted/30">
              {importRows.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma linha válida encontrada.</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="p-1">Nome</th>
                      <th className="p-1">Tipo</th>
                      <th className="p-1">Status</th>
                      <th className="p-1">Responsável</th>
                      <th className="p-1">Localização</th>
                      <th className="p-1">Próx. Manutenção</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 100).map((r, i) => (
                      <tr key={i}>
                        <td className="p-1">{r.name}</td>
                        <td className="p-1">{r.type}</td>
                        <td className="p-1">{r.status}</td>
                        <td className="p-1">{usersMap.get(r.assigneeId || '') || r.assigneeId || '—'}</td>
                        <td className="p-1">{r.location || '—'}</td>
                        <td className="p-1">{r.nextMaintenanceDate ? format(new Date(r.nextMaintenanceDate as any), 'dd/MM/yyyy') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={!!importError || importRows.length === 0} onClick={handleConfirmImport}>
              Importar {importRows.length > 0 ? `(${importRows.length})` : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer responsible dialog */}
      <AlertDialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transferir Responsável</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o novo responsável ou deixe em branco para remover a atribuição.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={transferSearch}
              onChange={(e) => setTransferSearch(e.target.value)}
            />
            <div ref={parentRef} className="h-64 overflow-auto border rounded-md">
              <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                <div 
                  onClick={() => setTransferUserId('')} 
                  className={`p-2 cursor-pointer ${transferUserId === '' ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
                >
                    Sem responsável
                </div>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const user = filteredUsers[virtualRow.index];
                  return (
                    <div
                      key={user.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start + 40}px)`, // +40 for the static "Sem responsável" item
                      }}
                      className={`p-2 cursor-pointer ${transferUserId === user.id ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
                      onClick={() => setTransferUserId(user.id)}
                    >
                      {user.name} <span className="text-muted-foreground">({user.email})</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {transferTargets.length > 1 && (
              <p className="text-xs text-muted-foreground">{transferTargets.length} ativo(s) serão atualizados.</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTransfer}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
});

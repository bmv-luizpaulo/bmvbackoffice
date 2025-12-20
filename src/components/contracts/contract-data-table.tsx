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
import { MoreHorizontal, Pencil, Trash2, Download } from "lucide-react"

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
import type { Contract, Asset, Project } from "@/lib/types";
import dynamic from "next/dynamic";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
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
import { useToast } from "@/hooks/use-toast"
import { uploadContractFileAction } from "@/lib/actions";
import { format } from 'date-fns';
import { Badge } from "../ui/badge";
import { ContractFormDialog } from './contract-form-dialog';
import { useUserProjects } from "@/hooks/useUserProjects";


export const ContractDataTable = React.memo(function ContractDataTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const contractsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'contracts') : null, [firestore]);
  const { data: contractsData, isLoading: isLoadingContracts } = useCollection<Contract>(contractsQuery);

  const assetsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'assets') : null, [firestore]);
  const { data: assetsData, isLoading: isLoadingAssets } = useCollection<Asset>(assetsQuery);
  
  const { projects: projectsData, isLoading: isLoadingProjects } = useUserProjects();
  
  const assetsMap = React.useMemo(() => new Map(assetsData?.map(a => [a.id, a.name])), [assetsData]);
  const projectsMap = React.useMemo(() => new Map(projectsData?.map(p => [p.id, p.name])), [projectsData]);
  
  const data = React.useMemo(() => contractsData ?? [], [contractsData]);

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'startDate', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedContract, setSelectedContract] = React.useState<Contract | null>(null);
  
  const handleEditClick = React.useCallback((contract: Contract) => {
    setSelectedContract(contract);
    setIsFormOpen(true);
  }, []);

  const handleDeleteClick = React.useCallback((contract: Contract) => {
    setSelectedContract(contract);
    setIsAlertOpen(true);
  }, []);

  const handleSaveContract = React.useCallback(async (contractData: Omit<Contract, 'id' | 'fileUrl' | 'uploaderId' | 'uploadedAt'>, file?: File, contractId?: string) => {
    if (!firestore) return;

    let fileUrl = selectedContract?.fileUrl;

    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      const result = await uploadContractFileAction(formData);
      if (result.success && result.data?.url) {
        fileUrl = result.data.url;
      } else {
        toast({ title: "Erro de Upload", description: result.error || 'Falha ao enviar o arquivo.', variant: 'destructive' });
        return;
      }
    }

    if (!fileUrl && !contractId) {
      toast({ title: "Arquivo Faltando", description: 'É necessário anexar o arquivo do contrato.', variant: 'destructive' });
      return;
    }

    const { uploaderId, ...finalData }: Partial<Contract> = { 
      ...contractData,
    };
    if (fileUrl) {
      finalData.fileUrl = fileUrl;
    }

    if (contractId) {
        const contractRef = doc(firestore, 'contracts', contractId);
        await updateDocumentNonBlocking(contractRef, finalData);
        toast({ title: "Contrato Atualizado", description: `O contrato "${finalData.title}" foi atualizado.` });
    } else {
        await addDocumentNonBlocking(collection(firestore, 'contracts'), { ...finalData, uploaderId: 'temp-id', uploadedAt: serverTimestamp() });
        toast({ title: "Contrato Criado", description: `O contrato "${finalData.title}" foi adicionado.` });
    }
    setIsFormOpen(false);
  }, [firestore, toast, selectedContract]);


  const handleDeleteContract = React.useCallback(async () => {
    if (!firestore || !selectedContract) return;
    const contractRef = doc(firestore, 'contracts', selectedContract.id);
    deleteDocumentNonBlocking(contractRef);
    
    toast({ title: "Contrato Excluído", description: `O contrato "${selectedContract.title}" foi removido.`, variant: 'destructive' });
    setIsAlertOpen(false);
    setSelectedContract(null);
  }, [firestore, selectedContract, toast]);

  const isLoading = isLoadingContracts || isLoadingAssets || isLoadingProjects;

  const columns: ColumnDef<Contract>[] = React.useMemo(() => [
    {
      accessorKey: "title",
      header: "Título do Contrato",
    },
    {
      accessorKey: "contractType",
      header: "Tipo",
      cell: ({ row }) => <Badge variant="secondary">{row.original.contractType}</Badge>
    },
    {
      accessorKey: "vendor",
      header: "Fornecedor / Terceiro",
    },
    {
      accessorKey: "startDate",
      header: "Data de Início",
      cell: ({ row }) => format(new Date(row.original.startDate), 'dd/MM/yyyy')
    },
    {
      accessorKey: "endDate",
      header: "Data de Fim",
      cell: ({ row }) => format(new Date(row.original.endDate), 'dd/MM/yyyy')
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const contract = row.original
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
                <a href={contract.fileUrl} target="_blank" rel="noopener noreferrer">
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    Baixar
                  </DropdownMenuItem>
                </a>
                <DropdownMenuItem onClick={() => handleEditClick(contract)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-500 focus:bg-red-50"
                  onClick={() => handleDeleteClick(contract)}
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
  ], [handleEditClick, handleDeleteClick]);

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
          placeholder="Filtrar por título..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Button onClick={() => {setSelectedContract(null); setIsFormOpen(true)}}>Adicionar Contrato</Button>
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
                  {isLoading ? "Carregando contratos..." : "Nenhum contrato encontrado."}
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
        <ContractFormDialog 
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSave={handleSaveContract}
          contract={selectedContract}
          assets={assetsData || []}
          projects={projectsData || []}
        />
      )}

      {isAlertOpen && (
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o contrato "{selectedContract?.title}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedContract(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteContract} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
});

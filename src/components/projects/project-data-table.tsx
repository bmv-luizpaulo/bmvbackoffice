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
import { MoreHorizontal, Pencil, Archive, KanbanSquare } from "lucide-react"

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
import type { Project, User, Role } from "@/lib/types";
import { useFirestore, useCollection, useDoc, useMemoFirebase, useUser as useAuthUser } from "@/firebase";
import { collection, doc, query, where, writeBatch, or } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { format } from "date-fns";
import { AddProjectDialog } from "./add-project-dialog";
import Link from "next/link";


interface ProjectDataTableProps {
  statusFilter: 'Em execução' | 'Arquivado';
  userFilter?: string | null;
}

export function ProjectDataTable({ statusFilter, userFilter }: ProjectDataTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: authUser } = useAuthUser();
  
  const userProfileQuery = React.useMemo(() => firestore && authUser?.uid ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser?.uid]);
  const { data: userProfile } = useDoc<User>(userProfileQuery);
  const roleQuery = React.useMemo(() => firestore && userProfile?.roleId ? doc(firestore, 'roles', userProfile.roleId) : null, [firestore, userProfile?.roleId]);
  const { data: role } = useDoc<Role>(roleQuery);
  const isManager = role?.isManager || role?.isDev;

  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    
    if (userFilter === 'me') {
        return query(
            collection(firestore, 'projects'), 
            where('status', '==', statusFilter),
            or(
                where('ownerId', '==', authUser.uid),
                where('teamMembers', 'array-contains', authUser.uid)
            )
        );
    }
    
    return query(collection(firestore, 'projects'), where('status', '==', statusFilter));
  }, [firestore, statusFilter, userFilter, authUser]);

  const { data: projectsData, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const usersMap = React.useMemo(() => new Map(usersData?.map(u => [u.id, u.name])), [usersData]);
  const data = React.useMemo(() => projectsData ?? [], [projectsData]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);

  const isLoading = isLoadingProjects || isLoadingUsers;

  const handleEditClick = (project: Project) => {
    setSelectedProject(project);
    setIsFormOpen(true);
  };
  
  const handleSaveProject = async (newProjectData: Omit<Project, 'id'>) => {
     if (!firestore) return;
     if (selectedProject) {
        await updateDocumentNonBlocking(doc(firestore, 'projects', selectedProject.id), newProjectData);
        toast({ title: "Projeto Atualizado", description: `O projeto "${newProjectData.name}" foi salvo.` });
     } else {
        const docRef = await addDocumentNonBlocking(collection(firestore, 'projects'), newProjectData);
        const stagesBatch = writeBatch(firestore);
        const stagesCollection = collection(firestore, 'projects', docRef.id, 'stages');
        const defaultStages = [
            { name: 'A Fazer', order: 1, description: 'Tarefas pendentes.' },
            { name: 'Em Progresso', order: 2, description: 'Tarefas em andamento.' },
            { name: 'Concluído', order: 3, description: 'Tarefas finalizadas.' }
        ];
        defaultStages.forEach(stage => {
            const stageRef = doc(stagesCollection);
            stagesBatch.set(stageRef, stage);
        });
        await stagesBatch.commit();
        toast({ title: "Projeto Adicionado", description: `O projeto "${newProjectData.name}" foi criado com sucesso.`});
     }
  };

  const handleToggleArchive = async (project: Project) => {
    if (!firestore) return;
    const newStatus = project.status === 'Arquivado' ? 'Em execução' : 'Arquivado';
    await updateDocumentNonBlocking(doc(firestore, 'projects', project.id), { status: newStatus });
    toast({ title: `Projeto ${newStatus === 'Arquivado' ? 'Arquivado' : 'Restaurado'}`, description: `O projeto "${project.name}" foi movido.` });
  };


  const columns: ColumnDef<Project>[] = React.useMemo(() => [
    {
      accessorKey: "name",
      header: "Nome do Projeto",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "ownerId",
      header: "Responsável",
      cell: ({ row }) => usersMap.get(row.original.ownerId) || <span className="text-muted-foreground">N/D</span>,
    },
    {
      accessorKey: "startDate",
      header: "Data de Início",
      cell: ({ row }) => format(new Date(row.original.startDate), 'dd/MM/yyyy')
    },
     {
      accessorKey: "endDate",
      header: "Data de Término",
      cell: ({ row }) => row.original.endDate ? format(new Date(row.original.endDate), 'dd/MM/yyyy') : <span className="text-muted-foreground">N/A</span>
    },
    {
        accessorKey: "budget",
        header: "Orçamento",
        cell: ({ row }) => (row.original.budget || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const project = row.original;
        if (!isManager) return null;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                    <Link href={`/projects?projectId=${project.id}`}>
                        <KanbanSquare className="mr-2 h-4 w-4" />
                        Ir para o Kanban
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEditClick(project)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleArchive(project)}>
                  <Archive className="mr-2 h-4 w-4" />
                  {project.status === 'Arquivado' ? 'Restaurar' : 'Arquivar'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ], [usersMap, isManager, handleToggleArchive, handleEditClick]);

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
          placeholder="Filtrar por nome..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        {isManager && <Button onClick={() => {setSelectedProject(null); setIsFormOpen(true)}}>Adicionar Projeto</Button>}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
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
                  {isLoading ? "Carregando projetos..." : "Nenhum projeto encontrado."}
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
        <AddProjectDialog 
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onAddProject={handleSaveProject}
          projectToEdit={selectedProject}
        />
      )}
    </div>
  )
}


'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from "next/navigation";
import { useFirestore, useCollection, useMemoFirebase, useAuthUser, usePermissions } from "@/firebase";
import { collection, query } from "firebase/firestore";
import type { Project, User, Task } from "@/lib/types";

import { FolderKanban, Plus, SlidersHorizontal, User as UserIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddProjectDialog } from '@/components/projects/add-project-dialog';
import { Card } from '@/components/ui/card';
import { useUserProjects } from '@/hooks/useUserProjects';

const ProjectCard = dynamic(() => import("@/components/projects/project-card").then(m => m.ProjectCard), { 
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />
});

export default function ProjectsListPage() {
  const firestore = useFirestore();
  const { user: authUser } = useAuthUser();
  const { isManager } = usePermissions();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [ownerFilter, setOwnerFilter] = React.useState('all');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [projectToEdit, setProjectToEdit] = React.useState<Project | null>(null);

  // --- Data Fetching ---
  const { projects: projectsData, isLoading: isLoadingProjects } = useUserProjects();
  
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  const usersMap = React.useMemo(() => new Map(usersData?.map(u => [u.id, u])), [usersData]);

  const tasksQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'tasks')) : null, [firestore]);
  const { data: allTasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
  
  const tasksByProject = React.useMemo(() => {
    if (!allTasks) return new Map<string, Task[]>();
    return allTasks.reduce((acc, task) => {
        if (task.projectId) {
            if (!acc.has(task.projectId)) acc.set(task.projectId, []);
            acc.get(task.projectId)!.push(task);
        }
        return acc;
    }, new Map<string, Task[]>());
  }, [allTasks]);

  const isLoading = isLoadingProjects || isLoadingUsers || isLoadingTasks;

  // --- Filtering Logic ---
  const myProjects = React.useMemo(() => {
    if (filter !== 'me' || isManager || !projectsData || !authUser) return projectsData;
    return projectsData.filter(p => p.ownerId === authUser.uid || p.teamMembers?.includes(authUser.uid));
  }, [filter, isManager, projectsData, authUser]);

  const filteredProjects = React.useMemo(() => {
    const dataToFilter = myProjects || [];
    return dataToFilter.filter(project => {
      const nameMatch = searchTerm.trim() === '' || project.name.toLowerCase().includes(searchTerm.toLowerCase());
      const ownerMatch = ownerFilter === 'all' || project.ownerId === ownerFilter;
      return nameMatch && ownerMatch;
    });
  }, [myProjects, searchTerm, ownerFilter]);

  const ownerOptions = React.useMemo(() => {
    if (!usersData) return [];
    const owners = new Set<string>();
    projectsData?.forEach(p => {
        if (p.ownerId) owners.add(p.ownerId);
    });
    return usersData.filter(u => owners.has(u.id));
  }, [projectsData, usersData]);

  const handleSaveProject = async (projectData: Omit<Project, 'id'>) => {
    // Logic is now in project-card, can be moved here if needed
  };

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
                    <FolderKanban className="h-8 w-8 text-primary" />
                    {filter === 'me' && !isManager ? 'Meus Projetos' : 'Projetos'}
                </h1>
                <p className="text-muted-foreground">
                {filter === 'me' && !isManager
                    ? 'Visualize os projetos em que você está envolvido.'
                    : 'Visualize e gerencie todos os seus projetos em um só lugar.'
                }
                </p>
            </div>
            <Button onClick={() => { setProjectToEdit(null); setIsFormOpen(true); }} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Novo Projeto
            </Button>
        </div>

        <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                    placeholder="Buscar por nome do projeto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select value={ownerFilter} onValueChange={setOwnerFilter} disabled={!isManager}>
                    <SelectTrigger>
                        <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-muted-foreground"/>
                            <SelectValue placeholder="Filtrar por responsável..." />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Responsáveis</SelectItem>
                        {ownerOptions.map(owner => (
                            <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Button variant="outline" className="md:w-fit md:justify-self-end">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Mais Filtros
                </Button>
            </div>
        </Card>
      </header>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <ProjectCard 
              key={project.id}
              project={project}
              tasks={tasksByProject.get(project.id) || []}
              owner={usersMap.get(project.ownerId)}
              teamMembers={project.teamMembers?.map(id => usersMap.get(id)).filter(Boolean) as User[] || []}
              onEdit={() => { setProjectToEdit(project); setIsFormOpen(true); }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Nenhum projeto corresponde aos seus filtros.</p>
        </div>
      )}

      {isFormOpen && (
        <AddProjectDialog 
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onAddProject={handleSaveProject}
          projectToEdit={projectToEdit}
        />
      )}
    </div>
  );
}

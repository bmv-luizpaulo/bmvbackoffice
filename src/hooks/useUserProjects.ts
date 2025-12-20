
'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser as useAuthUser, usePermissions } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Project } from "@/lib/types";

/**
 * Hook centralizado para buscar projetos com base nas permissões do usuário.
 * - Gestores podem ver todos os projetos.
 * - Usuários comuns veem apenas os projetos dos quais são donos ou membros,
 *   buscando em duas consultas separadas e unindo os resultados.
 *
 * @returns \{ projects: Project[] | null, isLoading: boolean }
 */
export function useUserProjects() {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: isAuthLoading } = useAuthUser();
  const { ready: permissionsReady, isManager } = usePermissions();
  
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Consulta para gestores - busca todos os projetos. Só é ativada se for manager.
  const allProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !permissionsReady || !isManager) return null;
    return query(collection(firestore, 'projects'));
  }, [firestore, permissionsReady, isManager]);
  const { data: allProjects, isLoading: isLoadingAll } = useCollection<Project>(allProjectsQuery);
  
  // Consultas para não-gestores
  const ownedProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser || isManager) return null;
    return query(collection(firestore, 'projects'), where('ownerId', '==', authUser.uid));
  }, [firestore, authUser, isManager]);

  const memberProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser || isManager) return null;
    return query(collection(firestore, 'projects'), where('teamMembers', 'array-contains', authUser.uid));
  }, [firestore, authUser, isManager]);

  const { data: ownedProjects, isLoading: isLoadingOwned } = useCollection<Project>(ownedProjectsQuery);
  const { data: memberProjects, isLoading: isLoadingMember } = useCollection<Project>(memberProjectsQuery);
  
  useEffect(() => {
    if (isAuthLoading || !permissionsReady) {
      setIsLoading(true);
      return;
    }

    if (isManager) {
        setProjects(allProjects);
        setIsLoading(isLoadingAll);
    } else {
        const projectsMap = new Map<string, Project>();
        (ownedProjects || []).forEach(p => projectsMap.set(p.id, p));
        (memberProjects || []).forEach(p => projectsMap.set(p.id, p));
        setProjects(Array.from(projectsMap.values()));
        setIsLoading(isLoadingOwned || isLoadingMember);
    }
    
  }, [
    isAuthLoading,
    isManager, 
    permissionsReady, 
    ownedProjects, 
    memberProjects, 
    allProjects,
    isLoadingOwned, 
    isLoadingMember,
    isLoadingAll,
  ]);

  return {
    projects,
    isLoading,
  };
}

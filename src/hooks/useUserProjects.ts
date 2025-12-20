'use client';

import { useEffect, useState, useMemo } from 'react';
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

  const ownedProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser || !permissionsReady) return null;
    // For managers, this query runs but its result is eventually superseded
    // For non-managers, this is one half of their data.
    return query(collection(firestore, 'projects'), where('ownerId', '==', authUser.uid));
  }, [firestore, authUser, permissionsReady]);

  const memberProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser || !permissionsReady) return null;
    // For managers, this query runs but its result is eventually superseded
    // For non-managers, this is the other half of their data.
    return query(collection(firestore, 'projects'), where('teamMembers', 'array-contains', authUser.uid));
  }, [firestore, authUser, permissionsReady]);

  // A single query for all projects, ONLY for managers.
  const allProjectsQuery = useMemoFirebase(() => {
      if (!firestore || !permissionsReady || !isManager) return null;
      return query(collection(firestore, 'projects'));
  }, [firestore, permissionsReady, isManager]);


  const { data: ownedProjects, isLoading: isLoadingOwned } = useCollection<Project>(ownedProjectsQuery);
  const { data: memberProjects, isLoading: isLoadingMember } = useCollection<Project>(memberProjectsQuery);
  const { data: allProjectsData, isLoading: isLoadingAll } = useCollection<Project>(allProjectsQuery);
  
  const [projects, setProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    if (!permissionsReady) {
        // Wait for permissions to be resolved
        return;
    }

    if (isManager) {
        // If manager, use the result of the "all projects" query
        setProjects(allProjectsData);
    } else {
        // If not a manager, combine owned and member projects
        if (!isLoadingOwned && !isLoadingMember) {
            const combined = new Map<string, Project>();
            (ownedProjects || []).forEach(p => combined.set(p.id, p));
            (memberProjects || []).forEach(p => combined.set(p.id, p));
            setProjects(Array.from(combined.values()));
        }
    }
  }, [
    isManager, 
    permissionsReady, 
    allProjectsData, 
    ownedProjects, 
    memberProjects, 
    isLoadingOwned, 
    isLoadingMember
  ]);

  const isLoading = isAuthLoading || !permissionsReady || (isManager ? isLoadingAll : isLoadingOwned || isLoadingMember);

  return {
    projects,
    isLoading,
  };
}

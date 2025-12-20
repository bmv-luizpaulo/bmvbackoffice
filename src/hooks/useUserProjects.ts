
'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser as useAuthUser, usePermissions } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
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

  // These queries are now stable and run for all users.
  // They will only return data if the security rules allow it.
  const ownedProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return query(collection(firestore, 'projects'), where('ownerId', '==', authUser.uid));
  }, [firestore, authUser]);

  const memberProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return query(collection(firestore, 'projects'), where('teamMembers', 'array-contains', authUser.uid));
  }, [firestore, authUser]);

  const allProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !isManager) return null; // Only create this query if the user is a manager
    return query(collection(firestore, 'projects'));
  }, [firestore, isManager]);

  const { data: ownedProjects, isLoading: isLoadingOwned } = useCollection<Project>(ownedProjectsQuery);
  const { data: memberProjects, isLoading: isLoadingMember } = useCollection<Project>(memberProjectsQuery);
  const { data: allProjects, isLoading: isLoadingAll } = useCollection<Project>(allProjectsQuery);

  useEffect(() => {
    const isInitialLoading = isAuthLoading || !permissionsReady || (isManager && isLoadingAll) || (!isManager && (isLoadingOwned || isLoadingMember));
    setIsLoading(isInitialLoading);

    if (isInitialLoading) {
      return;
    }

    if (isManager) {
      setProjects(allProjects);
    } else {
      const projectsMap = new Map<string, Project>();
      (ownedProjects || []).forEach(p => projectsMap.set(p.id, p));
      (memberProjects || []).forEach(p => projectsMap.set(p.id, p));
      setProjects(Array.from(projectsMap.values()));
    }
  }, [
    isManager, 
    permissionsReady, 
    isAuthLoading,
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

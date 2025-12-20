
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

  // Stable queries for non-managers. These run for everyone.
  const ownedProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return query(collection(firestore, 'projects'), where('ownerId', '==', authUser.uid));
  }, [firestore, authUser]);

  const memberProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return query(collection(firestore, 'projects'), where('teamMembers', 'array-contains', authUser.uid));
  }, [firestore, authUser]);

  const { data: ownedProjects, isLoading: isLoadingOwned } = useCollection<Project>(ownedProjectsQuery);
  const { data: memberProjects, isLoading: isLoadingMember } = useCollection<Project>(memberProjectsQuery);

  useEffect(() => {
    // Start loading as soon as the hook is used and permissions are not ready.
    setIsLoading(isAuthLoading || !permissionsReady);

    if (isAuthLoading || !permissionsReady) {
      return;
    }

    if (isManager) {
      // For managers, fetch all projects once permissions are confirmed.
      const fetchAllProjects = async () => {
        if (!firestore) return;
        setIsLoading(true);
        const allProjectsQuery = query(collection(firestore, 'projects'));
        const querySnapshot = await getDocs(allProjectsQuery);
        const allProjects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        setProjects(allProjects);
        setIsLoading(false);
      };
      fetchAllProjects();
    } else {
      // For non-managers, combine the results of the already-running filtered queries.
      if (!isLoadingOwned && !isLoadingMember) {
        const projectsMap = new Map<string, Project>();
        (ownedProjects || []).forEach(p => projectsMap.set(p.id, p));
        (memberProjects || []).forEach(p => projectsMap.set(p.id, p));
        setProjects(Array.from(projectsMap.values()));
        setIsLoading(false);
      }
    }
  }, [
    isManager, 
    permissionsReady, 
    isAuthLoading,
    ownedProjects, 
    memberProjects, 
    isLoadingOwned, 
    isLoadingMember,
    firestore
  ]);

  return {
    projects,
    isLoading,
  };
}

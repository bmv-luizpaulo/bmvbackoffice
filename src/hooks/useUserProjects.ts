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

  const managerProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !permissionsReady || !isManager) return null;
    return query(collection(firestore, 'projects'));
  }, [firestore, permissionsReady, isManager]);
  const { data: managerProjects, isLoading: isLoadingManagerProjects } = useCollection<Project>(managerProjectsQuery);
  
  const ownedProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser || !permissionsReady || isManager) return null;
    return query(collection(firestore, 'projects'), where('ownerId', '==', authUser.uid));
  }, [firestore, authUser, permissionsReady, isManager]);
  
  const memberProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser || !permissionsReady || isManager) return null;
    return query(collection(firestore, 'projects'), where('teamMembers', 'array-contains', authUser.uid));
  }, [firestore, authUser, permissionsReady, isManager]);

  const { data: ownedProjects, isLoading: isLoadingOwned } = useCollection<Project>(ownedProjectsQuery);
  const { data: memberProjects, isLoading: isLoadingMember } = useCollection<Project>(memberProjectsQuery);

  const [combinedProjects, setCombinedProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    if (isManager) {
        setCombinedProjects(managerProjects);
    } else {
        if (!isLoadingOwned && !isLoadingMember) {
            const allProjects = new Map<string, Project>();
            (ownedProjects || []).forEach(p => allProjects.set(p.id, p));
            (memberProjects || []).forEach(p => allProjects.set(p.id, p));
            setCombinedProjects(Array.from(allProjects.values()));
        }
    }
  }, [isManager, managerProjects, isLoadingOwned, isLoadingMember, ownedProjects, memberProjects]);

  const isLoading = isAuthLoading || !permissionsReady || (isManager ? isLoadingManagerProjects : (isLoadingOwned || isLoadingMember));

  return {
    projects: combinedProjects,
    isLoading: isLoading,
  };
}

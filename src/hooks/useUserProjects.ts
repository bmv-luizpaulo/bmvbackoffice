'use client';

import { useMemo, useEffect, useState } from 'react';
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

  // --- Para Gestores ---
  const managerProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !permissionsReady || !isManager) return null;
    return query(collection(firestore, 'projects'));
  }, [firestore, permissionsReady, isManager]);
  const { data: managerProjects, isLoading: isLoadingManagerProjects } = useCollection<Project>(managerProjectsQuery);

  // --- Para Não-Gestores ---
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

  // --- Lógica de Combinação ---
  const [combinedProjects, setCombinedProjects] = useState<Project[] | null>(null);
  const [isCombining, setIsCombining] = useState(true);

  useEffect(() => {
    if (isManager) {
        setCombinedProjects(managerProjects);
        setIsCombining(isLoadingManagerProjects);
    } else if (permissionsReady) {
        if (isLoadingOwned || isLoadingMember) {
            setIsCombining(true);
        } else {
            const allProjects = new Map<string, Project>();
            ownedProjects?.forEach(p => allProjects.set(p.id, p));
            memberProjects?.forEach(p => allProjects.set(p.id, p));
            setCombinedProjects(Array.from(allProjects.values()));
            setIsCombining(false);
        }
    }
  }, [
    isManager, 
    managerProjects, 
    isLoadingManagerProjects, 
    permissionsReady, 
    isLoadingOwned, 
    isLoadingMember, 
    ownedProjects, 
    memberProjects
  ]);

  return {
    projects: combinedProjects,
    isLoading: isAuthLoading || !permissionsReady || isCombining,
  };
}

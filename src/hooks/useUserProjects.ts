
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
  
  const [combinedProjects, setCombinedProjects] = useState<Project[] | null>(null);

  // Consultas estáveis para não-gestores
  const ownedProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return query(collection(firestore, 'projects'), where('ownerId', '==', authUser.uid));
  }, [firestore, authUser]);

  const memberProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return query(collection(firestore, 'projects'), where('teamMembers', 'array-contains', authUser.uid));
  }, [firestore, authUser]);
  
  // Consulta apenas para gestores, ativada somente quando isManager for true
  const allProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !permissionsReady || !isManager) return null;
    return query(collection(firestore, 'projects'));
  }, [firestore, permissionsReady, isManager]);

  const { data: ownedProjects, isLoading: isLoadingOwned } = useCollection<Project>(ownedProjectsQuery);
  const { data: memberProjects, isLoading: isLoadingMember } = useCollection<Project>(memberProjectsQuery);
  const { data: allProjects, isLoading: isLoadingAll } = useCollection<Project>(allProjectsQuery);

  useEffect(() => {
    if (!permissionsReady) {
        // Aguarda as permissões estarem prontas antes de decidir o que mostrar.
        return;
    }
    
    if (isManager) {
        // Se for gestor, usa a lista completa de projetos.
        setCombinedProjects(allProjects);
    } else {
        // Se não for gestor, combina as duas listas (projetos como dono e como membro).
        if (!isLoadingOwned && !isLoadingMember) {
            const projectsMap = new Map<string, Project>();
            (ownedProjects || []).forEach(p => projectsMap.set(p.id, p));
            (memberProjects || []).forEach(p => projectsMap.set(p.id, p));
            setCombinedProjects(Array.from(projectsMap.values()));
        }
    }
  }, [
    isManager, 
    permissionsReady, 
    allProjects, 
    ownedProjects, 
    memberProjects, 
    isLoadingOwned, 
    isLoadingMember
  ]);

  const isLoading = isAuthLoading || !permissionsReady || (isManager ? isLoadingAll : (isLoadingOwned || isLoadingMember));

  return {
    projects: combinedProjects,
    isLoading,
  };
}

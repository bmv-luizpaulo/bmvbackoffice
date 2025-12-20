'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser as useAuthUser, usePermissions } from "@/firebase";
import { collection, query, where, or } from "firebase/firestore";
import type { Project } from "@/lib/types";

/**
 * Hook centralizado para buscar projetos com base nas permissões do usuário.
 * - Gestores podem ver todos os projetos.
 * - Usuários comuns veem apenas os projetos dos quais são donos ou membros.
 * 
 * @returns \{ projects: Project[] | null, isLoading: boolean }
 */
export function useUserProjects() {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: isAuthLoading } = useAuthUser();
  const { ready: permissionsReady, isManager } = usePermissions();

  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser || !permissionsReady) {
      return null;
    }

    const projectsCollection = collection(firestore, 'projects');
    
    // Se não for gestor, a consulta DEVE ser filtrada.
    if (!isManager) {
        return query(
            projectsCollection,
            or(
                where('ownerId', '==', authUser.uid),
                where('teamMembers', 'array-contains', authUser.uid)
            )
        );
    }
    
    // Se for gestor, busca todos os projetos (sem filtro 'where').
    return query(projectsCollection);

  }, [firestore, authUser, permissionsReady, isManager]);

  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  return {
    projects,
    isLoading: isAuthLoading || !permissionsReady || isLoadingProjects,
  };
}

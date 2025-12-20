
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser as useAuthUser, usePermissions } from "@/firebase";
import { collection, query, where, or } from "firebase/firestore";
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

  // Consulta para projetos onde o usuário é o dono.
  const ownedProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser || !permissionsReady) return null;
    return query(collection(firestore, 'projects'), where('ownerId', '==', authUser.uid));
  }, [firestore, authUser, permissionsReady]);

  // Consulta para projetos onde o usuário é membro da equipe.
  const memberProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser || !permissionsReady) return null;
    return query(collection(firestore, 'projects'), where('teamMembers', 'array-contains', authUser.uid));
  }, [firestore, authUser, permissionsReady]);

  // Consulta que busca TODOS os projetos, executada APENAS se o usuário for um gestor.
  const allProjectsQuery = useMemoFirebase(() => {
      if (!firestore || !permissionsReady || !isManager) return null;
      return query(collection(firestore, 'projects'));
  }, [firestore, permissionsReady, isManager]);

  const { data: ownedProjects, isLoading: isLoadingOwned } = useCollection<Project>(ownedProjectsQuery);
  const { data: memberProjects, isLoading: isLoadingMember } = useCollection<Project>(memberProjectsQuery);
  const { data: allProjectsData, isLoading: isLoadingAll } = useCollection<Project>(allProjectsQuery);
  
  const [projects, setProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    // Aguarda até que as permissões e o usuário estejam carregados.
    if (!permissionsReady || isAuthLoading) {
        return;
    }

    if (isManager) {
        // Se for gestor, usa a lista completa de projetos.
        setProjects(allProjectsData);
    } else {
        // Se não for gestor, combina as duas listas (projetos como dono e como membro).
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
    isAuthLoading,
    allProjectsData, 
    ownedProjects, 
    memberProjects, 
    isLoadingOwned, 
    isLoadingMember
  ]);

  // O estado de carregamento geral depende do status do usuário.
  const isLoading = isAuthLoading || !permissionsReady || (isManager ? isLoadingAll : (isLoadingOwned || isLoadingMember));

  return {
    projects,
    isLoading,
  };
}

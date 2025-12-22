
'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser as useAuthUser, usePermissions } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Project } from "@/lib/types";

export function useUserProjects() {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: isAuthLoading } = useAuthUser();
  const { ready: permissionsReady, has } = usePermissions();
  
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Always run these queries. They are safe for all users.
  const ownedProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    return query(collection(firestore, 'projects'), where('ownerId', '==', authUser.uid));
  }, [firestore, authUser?.uid]);

  const memberProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    return query(collection(firestore, 'projects'), where('teamMembers', 'array-contains', authUser.uid));
  }, [firestore, authUser?.uid]);
  
  // This query is ONLY active when the user is a manager.
  const allProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !permissionsReady || !has('canViewAllProjects')) return null;
    return collection(firestore, 'projects');
  }, [firestore, permissionsReady, has]);

  const { data: ownedProjects, isLoading: isLoadingOwned } = useCollection<Project>(ownedProjectsQuery);
  const { data: memberProjects, isLoading: isLoadingMember } = useCollection<Project>(memberProjectsQuery);
  const { data: allProjects, isLoading: isLoadingAll } = useCollection<Project>(allProjectsQuery);

  useEffect(() => {
    // Determine overall loading state.
    const loading = isAuthLoading || !permissionsReady || isLoadingOwned || isLoadingMember || (has('canViewAllProjects') && isLoadingAll);
    setIsLoading(loading);

    if (loading) {
      return; // Wait for all data to be loaded
    }

    if (has('canViewAllProjects')) {
      setProjects(allProjects);
    } else {
      const projectsMap = new Map<string, Project>();
      (ownedProjects || []).forEach(p => projectsMap.set(p.id, p));
      (memberProjects || []).forEach(p => projectsMap.set(p.id, p));
      setProjects(Array.from(projectsMap.values()));
    }
    
  }, [
    isAuthLoading,
    permissionsReady,
    has,
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

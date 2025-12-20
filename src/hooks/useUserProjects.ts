
'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser as useAuthUser, usePermissions } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Project } from "@/lib/types";

export function useUserProjects() {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: isAuthLoading } = useAuthUser();
  const { ready: permissionsReady, isManager, canViewAllProjects } = usePermissions();
  
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Manager-only query
  const allProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !permissionsReady || !canViewAllProjects) return null;
    return query(collection(firestore, 'projects'));
  }, [firestore, permissionsReady, canViewAllProjects]);
  
  const { data: allProjects, isLoading: isLoadingAll } = useCollection<Project>(allProjectsQuery);

  // Queries for non-managers
  const ownedProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid || isManager) return null;
    return query(collection(firestore, 'projects'), where('ownerId', '==', authUser.uid));
  }, [firestore, authUser?.uid, isManager]);

  const memberProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid || isManager) return null;
    return query(collection(firestore, 'projects'), where('teamMembers', 'array-contains', authUser.uid));
  }, [firestore, authUser?.uid, isManager]);

  const { data: ownedProjects, isLoading: isLoadingOwned } = useCollection<Project>(ownedProjectsQuery);
  const { data: memberProjects, isLoading: isLoadingMember } = useCollection<Project>(memberProjectsQuery);

  useEffect(() => {
    if (isAuthLoading || !permissionsReady) {
      setIsLoading(true);
      return;
    }
    
    if (canViewAllProjects) {
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
    permissionsReady,
    canViewAllProjects,
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

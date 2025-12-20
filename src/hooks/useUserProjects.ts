
'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser as useAuthUser, usePermissions } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Project } from "@/lib/types";

export function useUserProjects() {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: isAuthLoading } = useAuthUser();
  const { ready: permissionsReady, isManager } = usePermissions();
  
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Queries for non-managers are always defined
  const ownedProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    return query(collection(firestore, 'projects'), where('ownerId', '==', authUser.uid));
  }, [firestore, authUser?.uid]);

  const memberProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    return query(collection(firestore, 'projects'), where('teamMembers', 'array-contains', authUser.uid));
  }, [firestore, authUser?.uid]);

  // Manager-only query
  const allProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !permissionsReady || !isManager) return null;
    return query(collection(firestore, 'projects'));
  }, [firestore, permissionsReady, isManager]);

  const { data: ownedProjects, isLoading: isLoadingOwned } = useCollection<Project>(ownedProjectsQuery);
  const { data: memberProjects, isLoading: isLoadingMember } = useCollection<Project>(memberProjectsQuery);
  const { data: allProjects, isLoading: isLoadingAll } = useCollection<Project>(allProjectsQuery);

  useEffect(() => {
    // Overall loading state depends on permissions and the relevant queries
    if (isAuthLoading || !permissionsReady) {
      setIsLoading(true);
      return;
    }
    
    if (isManager) {
      setIsLoading(isLoadingAll);
    } else {
      setIsLoading(isLoadingOwned || isLoadingMember);
    }
    
    // Logic to set the final projects list
    if (isManager) {
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
    isManager,
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

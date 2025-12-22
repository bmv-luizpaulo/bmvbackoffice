'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser as useAuthUser, usePermissions } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Task } from "@/lib/types";

export function useUserTasks() {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: isAuthLoading } = useAuthUser();
  const { ready: permissionsReady, isManager } = usePermissions();

  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Always run these queries. They are safe for all users.
  const assignedTasksQuery = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    return query(collection(firestore, 'tasks'), where('assigneeId', '==', authUser.uid));
  }, [firestore, authUser?.uid]);

  const teamTasksQuery = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    return query(collection(firestore, 'tasks'), where('participantIds', 'array-contains', authUser.uid));
  }, [firestore, authUser?.uid]);

  // This query is ONLY active when the user is a manager.
  const allTasksQuery = useMemoFirebase(() => {
    if (!firestore || !permissionsReady || !isManager) return null;
    return collection(firestore, 'tasks');
  }, [firestore, permissionsReady, isManager]);

  const { data: assignedTasks, isLoading: isLoadingAssigned } = useCollection<Task>(assignedTasksQuery);
  const { data: teamTasks, isLoading: isLoadingTeam } = useCollection<Task>(teamTasksQuery);
  const { data: allTasks, isLoading: isLoadingAll } = useCollection<Task>(allTasksQuery);

  useEffect(() => {
    // Determine overall loading state.
    const loading = isAuthLoading || !permissionsReady || isLoadingAssigned || isLoadingTeam || (isManager && isLoadingAll);
    setIsLoading(loading);

    if (loading) {
      return; // Wait for all data to be loaded
    }

    if (isManager) {
      setTasks(allTasks);
    } else {
      const tasksMap = new Map<string, Task>();
      (assignedTasks || []).forEach(t => tasksMap.set(t.id, t));
      (teamTasks || []).forEach(t => tasksMap.set(t.id, t));
      setTasks(Array.from(tasksMap.values()));
    }

  }, [
    isAuthLoading,
    permissionsReady,
    isManager,
    assignedTasks,
    teamTasks,
    allTasks,
    isLoadingAssigned,
    isLoadingTeam,
    isLoadingAll,
  ]);

  return {
    tasks,
    isLoading,
  };
}
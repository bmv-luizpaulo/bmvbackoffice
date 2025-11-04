'use client';

import dynamic from 'next/dynamic';
import { KanbanBoardSkeleton } from "@/components/projects/kanban-board-skeleton";

const KanbanBoard = dynamic(() => import('@/components/projects/kanban-board').then(m => m.KanbanBoard), {
  ssr: false,
  loading: () => <KanbanBoardSkeleton />,
});

export default function ClientKanbanBoard({ openNewProjectDialog }: { openNewProjectDialog?: boolean }) {
  return <KanbanBoard openNewProjectDialog={openNewProjectDialog} />;
}

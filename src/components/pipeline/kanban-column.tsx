'use client';

import { KanbanCard } from './kanban-card';
import type { Opportunity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useDroppable } from '@dnd-kit/core';

type KanbanColumnProps = {
  stage: Opportunity['stage'];
  opportunities: Opportunity[];
  onStageChange: (opportunityId: string, newStage: Opportunity['stage']) => void;
};

export function KanbanColumn({ stage, opportunities, onStageChange }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: stage });
  
  const stageColors: Record<Opportunity['stage'], string> = {
    Lead: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
    Qualificação: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
    Proposta: 'bg-amber-500/20 text-amber-700 border-amber-500/30',
    Negociação: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
    Ganha: 'bg-green-500/20 text-green-700 border-green-500/30',
    Perdida: 'bg-red-500/20 text-red-700 border-red-500/30',
  };

  const totalValue = opportunities.reduce((sum, opp) => sum + opp.value, 0);

  return (
    <div ref={setNodeRef} className="flex w-80 shrink-0 flex-col rounded-lg">
      <div className="flex flex-col rounded-t-lg bg-card p-3 shadow">
        <div className="flex items-center justify-between">
            <h2 className="font-semibold">{stage}</h2>
            <Badge variant="secondary" className="font-mono text-sm">{opportunities.length}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">${totalValue.toLocaleString()}</p>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-muted/50 p-3 rounded-b-lg">
        {opportunities.map(opp => (
          <KanbanCard key={opp.id} opportunity={opp} onStageChange={onStageChange} />
        ))}
        {opportunities.length === 0 && (
            <div className="flex h-full items-center justify-center rounded-md border-2 border-dashed border-border">
                <p className="text-sm text-muted-foreground">Arraste os cartões aqui</p>
            </div>
        )}
      </div>
    </div>
  );
}

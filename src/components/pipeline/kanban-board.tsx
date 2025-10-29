'use client';

import { useState } from 'react';
import { opportunities as initialOpportunities, STAGES } from '@/lib/data';
import { KanbanColumn } from './kanban-column';
import type { Opportunity } from '@/lib/types';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { useToast } from '@/hooks/use-toast';

export function KanbanBoard() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities);
  const { toast } = useToast();

  const handleStageChange = (opportunityId: string, newStage: Opportunity['stage']) => {
    setOpportunities(prev =>
      prev.map(opp =>
        opp.id === opportunityId ? { ...opp, stage: newStage } : opp
      )
    );
    const opp = opportunities.find(o => o.id === opportunityId);
    toast({
        title: "Opportunity Updated",
        description: `${opp?.title} moved to ${newStage}.`,
    });
    if (newStage === 'Won') {
        toast({
            title: "Contract Generation Initiated",
            description: `Contracts and tasks are being created for ${opp?.title}.`,
        });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const opportunityId = active.id as string;
        const newStage = over.id as Opportunity['stage'];
        handleStageChange(opportunityId, newStage);
    }
  };

  return (
     <DndContext onDragEnd={handleDragEnd}>
        <div className="flex h-full min-w-max gap-4 pb-4">
            {STAGES.map(stage => (
            <KanbanColumn
                key={stage}
                stage={stage}
                opportunities={opportunities.filter(opp => opp.stage === stage)}
                onStageChange={handleStageChange}
            />
            ))}
        </div>
    </DndContext>
  );
}

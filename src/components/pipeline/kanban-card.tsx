'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Opportunity } from '@/lib/types';
import { DollarSign, Building } from 'lucide-react';
import { OpportunityDialog } from './opportunity-dialog';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

type KanbanCardProps = {
  opportunity: Opportunity;
  onStageChange: (opportunityId: string, newStage: Opportunity['stage']) => void;
};

export function KanbanCard({ opportunity, onStageChange }: KanbanCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: opportunity.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
        onClick={() => setIsDialogOpen(true)}
      >
        <CardHeader className="p-4">
          <CardTitle className="text-base">{opportunity.title}</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
            <Building className="h-4 w-4" />
            <span>{opportunity.company}</span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex items-center justify-between">
          <Badge variant="outline" className="flex items-center gap-1 font-mono">
            <DollarSign className="h-3 w-3" />
            {opportunity.value.toLocaleString()}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Último contato: {new Date(opportunity.lastContact).toLocaleDateString()}
          </span>
        </CardContent>
      </Card>
      <OpportunityDialog
        opportunity={opportunity}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onStageChange={onStageChange}
      />
    </>
  );
}

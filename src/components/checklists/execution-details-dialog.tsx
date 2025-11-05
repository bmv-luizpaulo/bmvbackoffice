'use client';

import * as React from 'react';
import type { ChecklistExecution, ChecklistItem } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { format, formatDistanceStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Check, X, MessageSquare, CheckSquare, AlertTriangle, FileText, BarChart2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Progress } from '../ui/progress';

type ExecutionDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  execution: ChecklistExecution | null;
  teamName: string;
  userName: string;
};

function MetricCard({ title, value, icon }: { title: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-muted/50 text-center">
      <div className="text-muted-foreground mb-2">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{title}</p>
    </div>
  );
}

export function ExecutionDetailsDialog({ isOpen, onOpenChange, execution, teamName, userName }: ExecutionDetailsDialogProps) {
  if (!execution) return null;

  const { items, createdAt, executedAt } = execution;
  const completableItems = items.filter(i => i.type === 'item' || i.type === 'yes_no');
  const completedItemsCount = completableItems.filter(i => (i.type === 'item' && i.isCompleted) || (i.type === 'yes_no' && i.answer !== 'unanswered')).length;
  const progress = completableItems.length > 0 ? (completedItemsCount / completableItems.length) * 100 : 0;
  
  const executionTime = createdAt 
    ? formatDistanceStrict(new Date(executedAt.toDate()), new Date(createdAt.toDate()), { locale: ptBR, unit: 'minute' })
    : 'N/A';
    
  const noAnswers = completableItems.filter(i => i.type === 'yes_no' && i.answer === 'no').length;
  const unanswered = completableItems.filter(i => i.type === 'yes_no' && i.answer === 'unanswered').length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Execução do Checklist</DialogTitle>
          <DialogDescription>
            Análise detalhada de "{execution.checklistName}" executado por {userName} em {format(new Date(execution.executedAt.toDate()), 'dd/MM/yyyy HH:mm')}.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh]">
          <div className='pr-6 py-4 space-y-6'>
            <section>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><BarChart2 className='h-5 w-5 text-primary'/>Métricas</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard title="Conclusão" value={`${Math.round(progress)}%`} icon={<Progress value={progress} className='h-1 w-full'/>}/>
                <MetricCard title="Tempo de Execução" value={executionTime} icon={<Clock className='h-6 w-6'/>}/>
                <MetricCard title="Respostas 'Não'" value={noAnswers} icon={<XCircle className='h-6 w-6 text-red-500'/>}/>
                <MetricCard title="Itens Não Respondidos" value={unanswered} icon={<AlertTriangle className='h-6 w-6 text-amber-500'/>}/>
              </div>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-2">Itens do Checklist</h3>
              <div className="border rounded-md">
                 <div className="space-y-3 p-4">
                 {items.map((item: any) => {
                      if (item.type === 'header') {
                        return (
                            <div key={item.id} className="font-semibold text-sm bg-muted -mx-4 px-4 py-2 rounded-t-md">{item.description}</div>
                        )
                      }
                      if (item.type === 'item') {
                         return (
                            <div key={item.id} className="flex items-center gap-2 text-sm">
                               <CheckSquare className={cn("h-4 w-4", item.isCompleted ? 'text-green-600' : 'text-gray-300')} />
                               <span className={cn(item.isCompleted && "line-through text-muted-foreground")}>{item.description}</span>
                            </div>
                         )
                      }
                      if (item.type === 'yes_no') {
                        return (
                             <div key={item.id} className="flex flex-col gap-1 text-sm">
                                <div className="flex items-center gap-2">
                                    {item.answer === 'yes' && <Check className='h-4 w-4 text-green-600'/>}
                                    {item.answer === 'no' && <X className='h-4 w-4 text-red-600'/>}
                                    {item.answer === 'unanswered' && <AlertTriangle className='h-4 w-4 text-amber-500'/>}
                                    <span>{item.description}</span>
                                </div>
                                {item.comment && (
                                     <div className='flex items-start gap-2 text-gray-600 pl-6'>
                                        <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                                        <p className='italic text-xs'>"{item.comment}"</p>
                                    </div>
                                )}
                            </div>
                        )
                      }
                      return null;
                 })}
             </div>
              </div>
            </section>
          </div>
        </ScrollArea>
        
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" asChild>
              <a href={`/reports/checklist/${execution.checklistId}`} target="_blank">
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar Relatório PDF
              </a>
          </Button>
          <DialogClose asChild>
            <Button type="button">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

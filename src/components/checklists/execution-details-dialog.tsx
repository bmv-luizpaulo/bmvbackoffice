'use client';

import * as React from 'react';
import type { Checklist, ChecklistItem, Team, User } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';
import { Loader2, Check, X, MessageSquare, CheckSquare, AlertTriangle, FileText, BarChart2, Clock, CheckCircle2, XCircle, Trash2, Heading2, ThumbsUp } from 'lucide-react';
import { Progress } from '../ui/progress';
import { useCollection, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import Link from 'next/link';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

type ExecutionDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  checklist: Checklist | null;
  isManager?: boolean;
};

export function ExecutionDetailsDialog({ isOpen, onOpenChange, checklist, isManager }: ExecutionDetailsDialogProps) {
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const { toast } = useToast();
  
  const itemsQuery = useMemoFirebase(() => firestore && checklist ? query(collection(firestore, `checklists/${checklist.id}/items`), orderBy('order')) : null, [firestore, checklist?.id]);
  const { data: checklistItems, isLoading: isLoadingItems } = useCollection<ChecklistItem>(itemsQuery);
  
  const [commentDebounceTimers, setCommentDebounceTimers] = React.useState<Record<string, NodeJS.Timeout>>({});
  const [isFinishing, setIsFinishing] = React.useState(false);

  const [newItemText, setNewItemText] = React.useState('');
  const [newItemType, setNewItemType] = React.useState<'header' | 'item' | 'yes_no'>('header');

  const progress = React.useMemo(() => {
    if (!checklistItems || checklistItems.length === 0) return 0;
    const completableItems = checklistItems.filter(item => item.type === 'item' || item.type === 'yes_no');
    if (completableItems.length === 0) return 100;
    const completed = completableItems.filter(item => (item.type === 'item' && item.isCompleted) || (item.type === 'yes_no' && item.answer !== 'unanswered')).length;
    return (completed / completableItems.length) * 100;
  }, [checklistItems]);

  const handleAddNewItem = React.useCallback(async () => {
    if (!firestore || !checklist || !newItemText.trim()) return;
    const itemsCollection = collection(firestore, `checklists/${checklist.id}/items`);
    const newOrder = (checklistItems?.length || 0) + 1;
    const newItem: Partial<ChecklistItem> = {
      description: newItemText.trim(),
      order: newOrder,
      checklistId: checklist.id,
      type: newItemType,
    };
    if (newItemType === 'item') newItem.isCompleted = false;
    if (newItemType === 'yes_no') { newItem.answer = 'unanswered'; newItem.comment = ''; }
    await addDocumentNonBlocking(itemsCollection, newItem);
    setNewItemText('');
  }, [firestore, checklist, newItemText, newItemType, checklistItems]);

  const handleDeleteItem = React.useCallback((itemId: string) => {
    if (!firestore || !checklist) return;
    deleteDocumentNonBlocking(doc(firestore, `checklists/${checklist.id}/items`, itemId));
  }, [firestore, checklist]);
  
  const handleToggleItem = React.useCallback((item: ChecklistItem) => {
    if (!firestore || !checklist || item.type !== 'item') return;
    const itemRef = doc(firestore, `checklists/${checklist.id}/items`, item.id);
    updateDocumentNonBlocking(itemRef, { isCompleted: !item.isCompleted });
  }, [firestore, checklist]);
  
  const handleAnswerItem = React.useCallback((item: ChecklistItem, answer: 'yes' | 'no') => {
    if (!firestore || !checklist || item.type !== 'yes_no') return;
    const itemRef = doc(firestore, `checklists/${checklist.id}/items`, item.id);
    updateDocumentNonBlocking(itemRef, { answer });
  }, [firestore, checklist]);

  const handleCommentChange = React.useCallback((item: ChecklistItem, comment: string) => {
    if (!firestore || !checklist || item.type !== 'yes_no') return;
    if (commentDebounceTimers[item.id]) clearTimeout(commentDebounceTimers[item.id]);
    const timer = setTimeout(() => {
      const itemRef = doc(firestore, `checklists/${checklist.id}/items`, item.id);
      updateDocumentNonBlocking(itemRef, { comment });
    }, 1000);
    setCommentDebounceTimers(prev => ({ ...prev, [item.id]: timer }));
  }, [firestore, checklist, commentDebounceTimers]);

  const resetChecklist = async () => {
    if (!firestore || !checklistItems || checklistItems.length === 0) return;
    const batch = writeBatch(firestore);
    checklistItems.forEach(item => {
        const itemRef = doc(firestore, `checklists/${checklist.id}/items`, item.id);
        if (item.type === 'item') {
            batch.update(itemRef, { isCompleted: false });
        } else if (item.type === 'yes_no') {
            batch.update(itemRef, { answer: 'unanswered', comment: '' });
        }
    });
    await batch.commit();
  };

  const handleFinishAndSave = async () => {
    if (!checklist || !checklistItems || !authUser || !firestore) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Dados insuficientes para finalizar.' });
      return;
    }
    setIsFinishing(true);
    try {
      const executionData = {
        checklistId: checklist.id,
        checklistName: checklist.name,
        createdAt: checklist.createdAt,
        teamId: checklist.teamId,
        executedAt: serverTimestamp(),
        executedBy: authUser.uid,
        items: checklistItems,
      };
      await addDocumentNonBlocking(collection(firestore, 'checklistExecutions'), executionData);
      await resetChecklist();
      toast({ title: 'Checklist Finalizado', description: 'A execução foi salva e o checklist zerado para a próxima vez.'});
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar a execução.' });
    } finally {
      setIsFinishing(false);
    }
  };

  if (!checklist) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{checklist.name}</DialogTitle>
          <DialogDescription>{checklist.description}</DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mt-2">
          <Progress value={progress} className="w-full h-2" />
          <span>{Math.round(progress)}%</span>
        </div>

        <ScrollArea className="max-h-[60vh] pr-4 py-4">
          <div className="space-y-4">
            {isLoadingItems ? (
              <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin" /></div>
            ) : checklistItems && checklistItems.length > 0 ? (
              checklistItems.map((item) => {
                  if (item.type === 'header') {
                      return (
                          <div key={item.id} className="flex items-center gap-3 bg-muted p-3 rounded-md mt-4 mb-2">
                              <h4 className="flex-1 font-semibold text-sm">{item.description}</h4>
                              {isManager && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive/100" onClick={() => handleDeleteItem(item.id)}>
                                  <Trash2 className="h-4 w-4" />
                                  </Button>
                              )}
                          </div>
                      )
                  }
                  if (item.type === 'yes_no') {
                      return (
                            <div key={item.id} className="p-4 rounded-md border flex flex-col gap-3">
                              <div className="flex items-start justify-between">
                                  <label className="text-sm flex-1 pr-4">{item.description}</label>
                                  <div className="flex items-center gap-2">
                                      <Button size="sm" variant={item.answer === 'yes' ? 'default' : 'outline'} onClick={() => handleAnswerItem(item, 'yes')} className='h-8'><Check className='h-4 w-4 mr-1'/>Sim</Button>
                                      <Button size="sm" variant={item.answer === 'no' ? 'destructive' : 'outline'} onClick={() => handleAnswerItem(item, 'no')} className='h-8'><X className='h-4 w-4 mr-1'/>Não</Button>
                                      {isManager && (
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive/100" onClick={() => handleDeleteItem(item.id)}>
                                              <Trash2 className="h-4 w-4" />
                                          </Button>
                                      )}
                                  </div>
                              </div>
                              <Textarea 
                                  placeholder="Adicionar comentário (opcional)..." 
                                  defaultValue={item.comment || ''}
                                  onChange={(e) => handleCommentChange(item, e.target.value)}
                                  className="text-sm"
                              />
                          </div>
                      )
                  }
                  return (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/40 transition-colors">
                          <Checkbox id={`item-${item.id}`} checked={!!item.isCompleted} onCheckedChange={() => handleToggleItem(item)} />
                          <label htmlFor={`item-${item.id}`} className={cn("flex-1 text-sm cursor-pointer", item.isCompleted && "line-through text-muted-foreground")}>{item.description}</label>
                          {isManager && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive/100" onClick={() => handleDeleteItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                              </Button>
                          )}
                      </div>
                  )
              })
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum passo adicionado ainda.</p>
            )}
          </div>
          {isManager && (
            <form
                onSubmit={(e) => { e.preventDefault(); handleAddNewItem(); }}
                className="flex flex-col gap-4 pt-6 border-t mt-6"
            >
                <RadioGroup defaultValue="header" value={newItemType} onValueChange={(value: 'item' | 'header' | 'yes_no') => setNewItemType(value)} className="flex items-center gap-4">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="header" id="r-header" /><Label htmlFor="r-header" className='flex items-center gap-1'><Heading2 className='h-4 w-4'/>Título</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="item" id="r-item" /><Label htmlFor="r-item" className='flex items-center gap-1'><CheckSquare className='h-4 w-4'/>Item</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="yes_no" id="r-yes-no" /><Label htmlFor="r-yes-no" className='flex items-center gap-1'><ThumbsUp className='h-4 w-4'/>Sim/Não</Label></div>
                </RadioGroup>
                <div className="flex items-center gap-2">
                    <Input
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        placeholder="Adicionar novo item..."
                    />
                    <Button type="submit" disabled={!newItemText.trim()}>Adicionar</Button>
                </div>
            </form>
          )}
        </ScrollArea>
        
        <DialogFooter className="border-t pt-4 flex sm:justify-between items-center">
            <Button variant="outline" asChild>
                <Link href={`/reports/checklist/${checklist.id}`} target="_blank">
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar PDF (Preview)
                </Link>
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild><Button type="button" variant="secondary">Fechar</Button></DialogClose>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={isFinishing || progress < 100}>
                    {isFinishing && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                    Finalizar Execução
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Finalizar e Salvar Execução?</AlertDialogTitle>
                      <AlertDialogDescription>
                          Esta ação salvará um registro desta execução e zerará o checklist para o próximo uso. Deseja continuar?
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleFinishAndSave}>Confirmar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

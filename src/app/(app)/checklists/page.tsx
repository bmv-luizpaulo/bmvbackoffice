'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ListChecks, Trash2, Edit, Eye, CheckSquare, Heading2, Check, X, ThumbsUp, FileText } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, doc, orderBy, query } from 'firebase/firestore';
import type { Checklist, ChecklistItem, Team, User as UserType, Role } from '@/lib/types';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import NextDynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const ChecklistFormDialog = NextDynamic(() => import('@/components/checklists/checklist-form-dialog').then(m => m.ChecklistFormDialog));

export default function ChecklistsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: authUser } = useUser();
  
  const userProfileQuery = useMemoFirebase(() => firestore && authUser?.uid ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser?.uid]);
  const { data: userProfile } = useDoc<UserType>(userProfileQuery);
  
  const roleQuery = useMemoFirebase(() => firestore && userProfile?.roleId ? doc(firestore, 'roles', userProfile.roleId) : null, [firestore, userProfile?.roleId]);
  const { data: role } = useDoc<Role>(roleQuery);

  const [selectedChecklist, setSelectedChecklist] = React.useState<Checklist | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [checklistToEdit, setChecklistToEdit] = React.useState<Checklist | null>(null);
  const [newItemText, setNewItemText] = React.useState('');
  const [newItemType, setNewItemType] = React.useState<'item' | 'header' | 'yes_no'>('header');
  const [isEditMode, setIsEditMode] = React.useState(true);
  const [commentDebounceTimers, setCommentDebounceTimers] = React.useState<Record<string, NodeJS.Timeout>>({});


  const checklistsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'checklists'), orderBy('name')) : null, [firestore]);
  const { data: checklists, isLoading: isLoadingChecklists } = useCollection<Checklist>(checklistsQuery);
  
  const teamsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'teams') : null, [firestore]);
  const { data: teams } = useCollection<Team>(teamsQuery);
  const teamsMap = React.useMemo(() => new Map(teams?.map(t => [t.id, t.name])), [teams]);

  const itemsQuery = useMemoFirebase(() => firestore && selectedChecklist ? query(collection(firestore, `checklists/${selectedChecklist.id}/items`), orderBy('order')) : null, [firestore, selectedChecklist?.id]);
  const { data: checklistItems, isLoading: isLoadingItems } = useCollection<ChecklistItem>(itemsQuery);
  
  const progress = React.useMemo(() => {
    if (!checklistItems || checklistItems.length === 0) return 0;
    
    const completableItems = checklistItems.filter(item => item.type === 'item' || item.type === 'yes_no');
    if (completableItems.length === 0) return 0;

    const completed = completableItems.filter(item => {
        if (item.type === 'item') return item.isCompleted;
        if (item.type === 'yes_no') return item.answer !== 'unanswered';
        return false;
    }).length;
    
    return (completed / completableItems.length) * 100;
  }, [checklistItems]);


  React.useEffect(() => {
    if (!selectedChecklist && checklists && checklists.length > 0) {
      setSelectedChecklist(checklists[0]);
    } else if (selectedChecklist) {
      // Keep selected checklist in sync
      const updatedChecklist = checklists?.find(c => c.id === selectedChecklist.id);
      if(updatedChecklist) {
        setSelectedChecklist(updatedChecklist);
      } else if (checklists && checklists.length > 0) {
        setSelectedChecklist(checklists[0]);
      } else if (checklists && checklists.length === 0) {
        setSelectedChecklist(null);
      }
    }
  }, [checklists, selectedChecklist]);

  const handleSaveChecklist = React.useCallback(async (data: Omit<Checklist, 'id'>, id?: string) => {
    if (!firestore) return;
    if (id) {
      await updateDocumentNonBlocking(doc(firestore, 'checklists', id), data);
      toast({ title: "Checklist Atualizado", description: "As alterações foram salvas." });
    } else {
      await addDocumentNonBlocking(collection(firestore, 'checklists'), data);
      toast({ title: "Checklist Criado", description: "O novo checklist está pronto." });
    }
    setIsFormOpen(false);
  }, [firestore, toast]);
  
  const handleDeleteChecklist = React.useCallback((id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'checklists', id));
    toast({ title: "Checklist Excluído", variant: "destructive" });
  }, [firestore, toast]);

  const handleAddNewItem = async () => {
    if (!firestore || !selectedChecklist || !newItemText.trim()) return;
    
    const itemsCollection = collection(firestore, `checklists/${selectedChecklist.id}/items`);
    const newOrder = (checklistItems?.length || 0) + 1;
    
    const newItem: Partial<ChecklistItem> = {
      description: newItemText.trim(),
      order: newOrder,
      checklistId: selectedChecklist.id,
      type: newItemType,
    };

    if (newItemType === 'item') {
        newItem.isCompleted = false;
    } else if (newItemType === 'yes_no') {
        newItem.answer = 'unanswered';
        newItem.comment = '';
    }

    await addDocumentNonBlocking(itemsCollection, newItem);
    setNewItemText('');
  };

  const handleDeleteItem = (itemId: string) => {
    if (!firestore || !selectedChecklist) return;
    deleteDocumentNonBlocking(doc(firestore, `checklists/${selectedChecklist.id}/items`, itemId));
  };
  
  const handleToggleItem = (item: ChecklistItem) => {
    if (!firestore || !selectedChecklist || item.type !== 'item') return;
    const itemRef = doc(firestore, `checklists/${selectedChecklist.id}/items`, item.id);
    updateDocumentNonBlocking(itemRef, { isCompleted: !item.isCompleted });
  };
  
  const handleAnswerItem = (item: ChecklistItem, answer: 'yes' | 'no') => {
    if (!firestore || !selectedChecklist || item.type !== 'yes_no') return;
    const itemRef = doc(firestore, `checklists/${selectedChecklist.id}/items`, item.id);
    updateDocumentNonBlocking(itemRef, { answer });
  };
  
  const handleCommentChange = (item: ChecklistItem, comment: string) => {
    if (!firestore || !selectedChecklist || item.type !== 'yes_no') return;
    
    // Clear previous timeout if it exists
    if (commentDebounceTimers[item.id]) {
      clearTimeout(commentDebounceTimers[item.id]);
    }
    
    const timer = setTimeout(() => {
      const itemRef = doc(firestore, `checklists/${selectedChecklist.id}/items`, item.id);
      updateDocumentNonBlocking(itemRef, { comment });
    }, 1000); // Debounce time of 1 second

    setCommentDebounceTimers(prev => ({ ...prev, [item.id]: timer }));
  };

  const isManager = role?.isManager || role?.isDev;
  const canEdit = isManager && isEditMode;

  React.useEffect(() => {
    if (!isManager) {
        setIsEditMode(false);
    }
  }, [isManager]);


  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
            <ListChecks className="h-8 w-8 text-primary" />
            Checklists
          </h1>
          <p className="text-muted-foreground">
            {isManager ? 'Crie e gerencie checklists padronizados.' : 'Execute os checklists para seus processos.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
            {isManager && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button variant="outline" size="icon" onClick={() => setIsEditMode(!isEditMode)}>
                                {isEditMode ? <Eye className="h-4 w-4" /> : <Edit className="h-4 w-4 text-primary" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Alternar para modo de {isEditMode ? 'visualização' : 'edição'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            {canEdit && (
                <Button onClick={() => { setChecklistToEdit(null); setIsFormOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Criar Checklist
                </Button>
            )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Todos os Checklists</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {isLoadingChecklists ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : checklists && checklists.length > 0 ? (
                checklists.map(checklist => (
                  <Button
                    key={checklist.id}
                    variant={selectedChecklist?.id === checklist.id ? "secondary" : "ghost"}
                    className="w-full h-auto justify-start text-left flex flex-col items-start p-2"
                    onClick={() => setSelectedChecklist(checklist)}
                  >
                    <span className="font-medium">{checklist.name}</span>
                    <span className="text-xs text-muted-foreground">{teamsMap.get(checklist.teamId) || 'Equipe desconhecida'}</span>
                  </Button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground p-4 text-center">Nenhum checklist criado.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          {selectedChecklist ? (
            <>
              <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{selectedChecklist.name}</CardTitle>
                        <CardDescription>
                            {selectedChecklist.description || `Checklist para a equipe ${teamsMap.get(selectedChecklist.teamId) || 'desconhecida'}`}
                        </CardDescription>
                    </div>
                    {canEdit && (
                        <div className='flex items-center'>
                            <Button variant="ghost" size="icon" onClick={() => { setChecklistToEdit(selectedChecklist); setIsFormOpen(true); }}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className='text-destructive hover:text-destructive'>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta ação não pode ser desfeita e excluirá o checklist "{selectedChecklist.name}" e todos os seus itens.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        className='bg-destructive hover:bg-destructive/90'
                                        onClick={() => handleDeleteChecklist(selectedChecklist.id)}
                                    >
                                        Excluir
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                </div>
                <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Progress value={progress} className="w-full" />
                        <span>{Math.round(progress)}%</span>
                    </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Passos do Checklist</h3>
                    <div className="space-y-1 max-h-[45vh] overflow-y-auto pr-2">
                      {isLoadingItems ? (
                        Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                      ) : checklistItems && checklistItems.length > 0 ? (
                        checklistItems.map((item) => {
                            if (item.type === 'header') {
                                return (
                                    <div key={item.id} className="flex items-center gap-3 bg-muted p-3 rounded-md mt-4 mb-2">
                                        <h4 className="flex-1 font-semibold text-sm">{item.description}</h4>
                                        {canEdit && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive/100" onClick={() => handleDeleteItem(item.id)}>
                                            <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                )
                            }
                            if (item.type === 'yes_no') {
                                return (
                                     <div key={item.id} className="p-3 rounded-md border bg-background flex flex-col gap-3">
                                        <div className="flex items-start justify-between">
                                            <label className="text-sm flex-1 pr-4">{item.description}</label>
                                            <div className="flex items-center gap-2">
                                                <Button size="sm" variant={item.answer === 'yes' ? 'default' : 'outline'} onClick={() => handleAnswerItem(item, 'yes')} className='h-8'><Check className='h-4 w-4 mr-1'/>Sim</Button>
                                                <Button size="sm" variant={item.answer === 'no' ? 'destructive' : 'outline'} onClick={() => handleAnswerItem(item, 'no')} className='h-8'><X className='h-4 w-4 mr-1'/>Não</Button>
                                                {canEdit && (
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
                                <div key={item.id} className="flex items-center gap-3 p-3 rounded-md">
                                    <Checkbox id={`item-${item.id}`} checked={item.isCompleted} onCheckedChange={() => handleToggleItem(item)} />
                                    <label htmlFor={`item-${item.id}`} className={cn("flex-1 text-sm cursor-pointer", item.isCompleted && "line-through text-muted-foreground")}>{item.description}</label>
                                    {canEdit && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive/100" onClick={() => handleDeleteItem(item.id)}>
                                        <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            )
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground pt-4 text-center">Nenhum passo adicionado ainda.</p>
                      )}
                    </div>
                  </div>
                   {canEdit && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleAddNewItem();
                            }}
                            className="flex flex-col gap-4 pt-4 border-t"
                        >
                            <RadioGroup defaultValue="header" value={newItemType} onValueChange={(value: 'item' | 'header' | 'yes_no') => setNewItemType(value)} className="flex items-center gap-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="header" id="r-header" />
                                    <Label htmlFor="r-header" className='flex items-center gap-1'><Heading2 className='h-4 w-4'/>Título de Seção</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="item" id="r-item" />
                                    <Label htmlFor="r-item" className='flex items-center gap-1'><CheckSquare className='h-4 w-4'/>Passo (Item)</Label>
                                </div>
                                 <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="yes_no" id="r-yes-no" />
                                    <Label htmlFor="r-yes-no" className='flex items-center gap-1'><ThumbsUp className='h-4 w-4'/>Verificação (Sim/Não)</Label>
                                </div>
                            </RadioGroup>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={newItemText}
                                    onChange={(e) => setNewItemText(e.target.value)}
                                    placeholder={
                                        newItemType === 'item' ? "Adicionar novo passo..." : 
                                        newItemType === 'header' ? "Adicionar novo título de seção..." :
                                        "Adicionar nova pergunta de verificação..."
                                    }
                                />
                                <Button type="submit" disabled={!newItemText.trim()}>Adicionar</Button>
                            </div>
                        </form>
                   )}
                </div>
                 <div className="border-t pt-4 mt-4">
                    <Button asChild className='w-full'>
                      <Link href={`/reports/checklist/${selectedChecklist.id}`} target="_blank">
                        <FileText className="mr-2 h-4 w-4" />
                        Gerar Relatório
                      </Link>
                    </Button>
                  </div>
              </CardContent>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 h-full">
              <ListChecks className="h-16 w-16 text-muted-foreground/50" />
              <p className="text-lg font-semibold mt-4">Selecione um Checklist</p>
              <p className="text-muted-foreground mt-2">
                  Escolha um checklist da lista para ver seus detalhes ou crie um novo para começar.
              </p>
            </div>
          )}
        </Card>
      </div>

      {isManager && isFormOpen && (
        <ChecklistFormDialog
            isOpen={isFormOpen}
            onOpenChange={setIsFormOpen}
            onSave={handleSaveChecklist}
            checklist={checklistToEdit}
            teams={teams || []}
        />
      )}
    </div>
  );
}

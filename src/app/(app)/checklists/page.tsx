'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ListChecks, Trash2, Edit } from "lucide-react";
import { useCollection, useFirestore } from '@/firebase';
import { collection, doc, orderBy, query } from 'firebase/firestore';
import type { Checklist, ChecklistItem, Team } from '@/lib/types';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const ChecklistFormDialog = dynamic(() => import('@/components/checklists/checklist-form-dialog').then(m => m.ChecklistFormDialog));

export default function ChecklistsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedChecklist, setSelectedChecklist] = React.useState<Checklist | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [checklistToEdit, setChecklistToEdit] = React.useState<Checklist | null>(null);
  const [newItemText, setNewItemText] = React.useState('');

  const checklistsQuery = React.useMemo(() => firestore ? query(collection(firestore, 'checklists'), orderBy('name')) : null, [firestore]);
  const { data: checklists, isLoading: isLoadingChecklists } = useCollection<Checklist>(checklistsQuery);
  
  const teamsQuery = React.useMemo(() => firestore ? collection(firestore, 'teams') : null, [firestore]);
  const { data: teams } = useCollection<Team>(teamsQuery);
  const teamsMap = React.useMemo(() => new Map(teams?.map(t => [t.id, t.name])), [teams]);

  const itemsQuery = React.useMemo(() => firestore && selectedChecklist ? query(collection(firestore, `checklists/${selectedChecklist.id}/items`), orderBy('order')) : null, [firestore, selectedChecklist]);
  const { data: checklistItems, isLoading: isLoadingItems } = useCollection<ChecklistItem>(itemsQuery);

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

  const handleSaveChecklist = React.useCallback((data: Omit<Checklist, 'id'>, id?: string) => {
    if (!firestore) return;
    if (id) {
      updateDocumentNonBlocking(doc(firestore, 'checklists', id), data);
      toast({ title: "Checklist Atualizado", description: "As alterações foram salvas." });
    } else {
      addDocumentNonBlocking(collection(firestore, 'checklists'), data);
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

    await addDocumentNonBlocking(itemsCollection, {
      description: newItemText.trim(),
      order: newOrder,
      checklistId: selectedChecklist.id,
    });
    setNewItemText('');
  };

  const handleDeleteItem = (itemId: string) => {
    if (!firestore || !selectedChecklist) return;
    deleteDocumentNonBlocking(doc(firestore, `checklists/${selectedChecklist.id}/items`, itemId));
  };


  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
            <ListChecks className="h-8 w-8 text-primary" />
            Checklists
          </h1>
          <p className="text-muted-foreground">
            Crie e gerencie checklists padronizados para seus processos.
          </p>
        </div>
        <Button onClick={() => { setChecklistToEdit(null); setIsFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Criar Checklist
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Todos os Checklists</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {isLoadingChecklists ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
              ) : checklists && checklists.length > 0 ? (
                checklists.map(checklist => (
                  <Button
                    key={checklist.id}
                    variant={selectedChecklist?.id === checklist.id ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedChecklist(checklist)}
                  >
                    {checklist.name}
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
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Passos do Checklist</h3>
                    <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-2">
                      {isLoadingItems ? (
                        Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                      ) : checklistItems && checklistItems.length > 0 ? (
                        checklistItems.map((item, index) => (
                          <div key={item.id} className="flex items-center gap-2 bg-muted/50 p-2 rounded-md">
                            <span className="font-bold text-sm text-primary">{index + 1}.</span>
                            <p className="flex-1 text-sm">{item.description}</p>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive/100" onClick={() => handleDeleteItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground pt-4 text-center">Nenhum passo adicionado ainda.</p>
                      )}
                    </div>
                  </div>
                   <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddNewItem();
                      }}
                      className="flex items-center gap-2 pt-4 border-t"
                    >
                      <Input
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        placeholder="Adicionar novo passo..."
                      />
                      <Button type="submit" disabled={!newItemText.trim()}>Adicionar Passo</Button>
                    </form>
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

      {isFormOpen && (
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

    
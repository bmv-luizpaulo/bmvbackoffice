'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ListChecks, Trash2, Edit, Eye, Archive, ArchiveRestore, MoreHorizontal, CheckSquare, ThumbsUp, Heading2 } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, usePermissions } from '@/firebase';
import { collection, doc, orderBy, query, where, serverTimestamp } from 'firebase/firestore';
import type { Checklist, Team, User as UserType, Role } from '@/lib/types';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import NextDynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

const ChecklistFormDialog = NextDynamic(() => import('@/components/checklists/checklist-form-dialog').then(m => m.ChecklistFormDialog));
const ExecutionDetailsDialog = NextDynamic(() => import('@/components/checklists/execution-details-dialog').then(m => m.ExecutionDetailsDialog), { ssr: false });

export default function ChecklistsPage() {
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  const { toast } = useToast();
  const { user: authUser, isUserLoading } = useUser();
  const { ready: permissionsReady, isManager } = usePermissions();
  
  const userProfileQuery = useMemoFirebase(() => firestore && authUser?.uid ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileQuery);
  
  const [activeTab, setActiveTab] = React.useState<'ativo' | 'arquivado'>('ativo');
  const [selectedChecklist, setSelectedChecklist] = React.useState<Checklist | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [checklistToEdit, setChecklistToEdit] = React.useState<Checklist | null>(null);
  const [checklistToDelete, setChecklistToDelete] = React.useState<Checklist | null>(null);

  const checklistsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'checklists'), orderBy('name'));
  }, [firestore]);

  const { data: allChecklists, isLoading: isLoadingChecklists } = useCollection<Checklist>(checklistsQuery);

  const filteredChecklists = React.useMemo(() => {
    if (!allChecklists || !permissionsReady) return [];
    if (isManager || !filterParam) {
      return allChecklists;
    }
    if (filterParam === 'me') {
      if (!userProfile || !userProfile.teamIds) {
        return [];
      }
      const userTeamIds = userProfile.teamIds;
      return allChecklists.filter(c => userTeamIds.includes(c.teamId));
    }
    return allChecklists;
  }, [allChecklists, isManager, filterParam, userProfile, permissionsReady]);

  
  const teamsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'teams') : null, [firestore]);
  const { data: teams } = useCollection<Team>(teamsQuery);
  const teamsMap = React.useMemo(() => new Map(teams?.map(t => [t.id, t.name])), [teams]);
  
  const { activeChecklists, archivedChecklists } = React.useMemo(() => {
    const active = filteredChecklists?.filter(c => c.status !== 'arquivado') || [];
    const archived = filteredChecklists?.filter(c => c.status === 'arquivado') || [];
    return { activeChecklists: active, archivedChecklists: archived };
  }, [filteredChecklists]);
  
  const currentChecklistList = activeTab === 'ativo' ? activeChecklists : archivedChecklists;

  const handleSaveChecklist = React.useCallback(async (data: Omit<Checklist, 'id'>, id?: string) => {
    if (!firestore || !authUser) return;
    
    if (id) {
      const dataToSave = { ...data };
      await updateDocumentNonBlocking(doc(firestore, 'checklists', id), dataToSave);
      toast({ title: "Checklist Atualizado", description: "As alterações foram salvas." });
    } else {
       const dataToSave = { 
        ...data, 
        status: 'ativo',
        creatorId: authUser.uid,
        createdAt: serverTimestamp(),
      };
      await addDocumentNonBlocking(collection(firestore, 'checklists'), dataToSave);
      toast({ title: "Checklist Criado", description: "O novo checklist está pronto." });
    }
    setIsFormOpen(false);
    setChecklistToEdit(null);
  }, [firestore, toast, authUser]);
  
  const confirmDelete = React.useCallback(() => {
    if (!firestore || !checklistToDelete) return;
    deleteDocumentNonBlocking(doc(firestore, 'checklists', checklistToDelete.id));
    toast({ title: "Checklist Excluído", variant: "destructive" });
    setChecklistToDelete(null);
  }, [firestore, toast, checklistToDelete]);

  const handleToggleArchive = React.useCallback((checklist: Checklist) => {
    if (!firestore) return;
    const newStatus = checklist.status === 'arquivado' ? 'ativo' : 'arquivado';
    updateDocumentNonBlocking(doc(firestore, 'checklists', checklist.id), { status: newStatus });
    toast({ title: `Checklist ${newStatus === 'ativo' ? 'Restaurado' : 'Arquivado'}` });
  }, [firestore, toast]);

  const isLoading = isLoadingChecklists || isUserLoading || isProfileLoading || !permissionsReady;

  return (
    <div className="space-y-6">
       <header className="space-y-4">
        <div className="flex justify-between items-start">
            <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
                <ListChecks className="h-8 w-8 text-primary" />
                {filterParam === 'me' ? 'Meus Checklists' : 'Checklists'}
            </h1>
            <p className="text-muted-foreground">
                {filterParam === 'me'
                ? 'Execute os checklists relevantes para suas equipes.'
                : isManager
                    ? 'Crie e gerencie checklists padronizados para suas equipes.'
                    : 'Execute os checklists para seus processos.'
                }
            </p>
            </div>
            {isManager && (
              <Button onClick={() => { setChecklistToEdit(null); setIsFormOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> Criar Checklist
              </Button>
            )}
        </div>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList>
                <TabsTrigger value="ativo">Ativos</TabsTrigger>
                <TabsTrigger value="arquivado">Arquivados</TabsTrigger>
            </TabsList>
        </Tabs>
    </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)
        ) : currentChecklistList.length > 0 ? (
          currentChecklistList.map(checklist => (
            <Card key={checklist.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="truncate">{checklist.name}</CardTitle>
                <CardDescription className="truncate">{teamsMap.get(checklist.teamId) || 'Equipe desconhecida'}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-2">{checklist.description}</p>
              </CardContent>
              <CardContent className="flex justify-between items-center gap-2">
                <Button variant="outline" onClick={() => setSelectedChecklist(checklist)}>
                  <Eye className="mr-2 h-4 w-4" /> Visualizar
                </Button>
                {isManager && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setChecklistToEdit(checklist); setIsFormOpen(true); }}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleArchive(checklist)}>
                            {checklist.status === 'arquivado' ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                            {checklist.status === 'arquivado' ? 'Restaurar' : 'Arquivar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setChecklistToDelete(checklist)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground p-4 text-center md:col-span-3">Nenhum checklist encontrado.</p>
        )}
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

      {selectedChecklist && (
        <ExecutionDetailsDialog
          isOpen={!!selectedChecklist}
          onOpenChange={(open) => !open && setSelectedChecklist(null)}
          checklist={selectedChecklist}
          isManager={isManager}
        />
      )}

      {checklistToDelete && (
          <AlertDialog open={!!checklistToDelete} onOpenChange={(open) => !open && setChecklistToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita e excluirá o checklist "{checklistToDelete?.name}" e todos os seus itens.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setChecklistToDelete(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        className='bg-destructive hover:bg-destructive/90'
                        onClick={confirmDelete}
                    >
                        Excluir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      )}
    </div>
  );
}

'use client';

import * as React from "react";
import type { Asset, AssetHistory, User } from "@/lib/types";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Loader2, User as UserIcon, Settings, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

type AssetHistoryDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  asset: Asset | null;
  usersMap: Map<string, User>;
};

const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}


export function AssetHistoryDialog({ isOpen, onOpenChange, asset, usersMap }: AssetHistoryDialogProps) {
  const firestore = useFirestore();

  const historyQuery = useMemoFirebase(() => 
    firestore && asset ? 
    query(collection(firestore, `assets/${asset.id}/history`), orderBy('timestamp', 'desc')) 
    : null, 
  [firestore, asset?.id]);
  
  const { data: history, isLoading: isLoadingHistory } = useCollection<AssetHistory>(historyQuery);

  const renderEventDetails = (event: AssetHistory) => {
    switch(event.event) {
        case 'Ativo Criado':
            return <p>O ativo foi cadastrado no sistema.</p>
        case 'Atribuição Alterada':
            return <p>Responsável alterado de <strong>{event.details?.from || 'N/A'}</strong> para <strong>{event.details?.to || 'N/A'}</strong>.</p>;
        case 'Atribuição Inicial':
            return <p>Ativo atribuído a <strong>{event.details?.to || 'N/A'}</strong>.</p>
        case 'Ativo Excluído':
            return <p className="text-destructive">O ativo foi excluído do sistema.</p>
        default:
            return <p>{event.event}</p>
    }
  }
  
  const EventIcon = ({ eventName }: { eventName: string }) => {
    switch (eventName) {
        case 'Ativo Criado':
            return <PlusCircle className="h-5 w-5 text-green-500" />;
        case 'Atribuição Alterada':
        case 'Atribuição Inicial':
            return <UserIcon className="h-5 w-5 text-blue-500" />;
        default:
            return <Settings className="h-5 w-5 text-gray-500" />;
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico do Ativo: {asset?.name}</DialogTitle>
          <DialogDescription>
            Veja todas as movimentações e alterações deste ativo.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-96 w-full pr-4">
            <div className="relative pl-6">
                {isLoadingHistory && <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin" /></div>}

                {!isLoadingHistory && history && history.length === 0 && (
                    <div className="text-center text-muted-foreground py-10">
                        Nenhum histórico encontrado para este ativo.
                    </div>
                )}
                
                {!isLoadingHistory && history && history.map((event, index) => {
                    const actor = usersMap.get(event.actorId);
                    return (
                        <div key={event.id} className="relative flex items-start pb-8">
                            {/* Linha do tempo */}
                            {index < history.length -1 && <div className="absolute left-3 top-5 h-full w-0.5 bg-border"></div>}

                            {/* Ícone do evento */}
                            <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-background ring-4 ring-background">
                               <EventIcon eventName={event.event} />
                            </div>

                            <div className="ml-10">
                                <div className="flex items-center gap-2">
                                     <p className="text-sm font-medium">
                                        {format(new Date(event.timestamp), "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                                    </p>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">{renderEventDetails(event)}</div>
                                {actor && (
                                     <div className="flex items-center gap-2 mt-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={actor.avatarUrl} />
                                            <AvatarFallback>{getInitials(actor.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-muted-foreground">por {actor.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </ScrollArea>
        

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

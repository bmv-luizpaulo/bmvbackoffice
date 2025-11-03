'use client';
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import type { Chat } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hash, MessageSquare } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import Link from "next/link";
import { Button } from "../ui/button";

function ActiveForumsCard() {
    const firestore = useFirestore();
    const forumsQuery = useMemoFirebase(() => 
        firestore 
        ? query(
            collection(firestore, 'chats'), 
            where('type', '==', 'forum'),
            orderBy('lastMessage.timestamp', 'desc'),
            limit(5)
          ) 
        : null, 
    [firestore]);

    const { data: forums, isLoading } = useCollection<Chat>(forumsQuery);

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <MessageSquare className="text-primary"/>
                    Fóruns Ativos
                </CardTitle>
                <CardDescription>
                    Veja as conversas mais recentes acontecendo agora.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {isLoading && (
                        <>
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </>
                    )}
                    {!isLoading && forums && forums.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum fórum ativo encontrado.</p>
                    )}
                    {forums?.map(forum => (
                        <Link href="/chat" key={forum.id}>
                            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                                <div className="p-2 bg-muted rounded-md">
                                    <Hash className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">{forum.name}</p>
                                    <p className="text-sm text-muted-foreground truncate">{forum.lastMessage?.text || 'Nenhuma mensagem recente.'}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                    {!isLoading && forums && forums.length > 0 && (
                         <Button variant="outline" className="w-full" asChild>
                            <Link href="/chat">Ver todos os fóruns</Link>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default ActiveForumsCard;

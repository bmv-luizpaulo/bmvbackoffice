
'use client';
import { ChatLayout } from "@/components/chat/chat-layout";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";
import type { User as UserType, Conversation } from "@/lib/types";
import { useEffect } from "react";


async function ensureGlobalForumExists(firestore: any, allUsers: UserType[]) {
    if (!firestore || !allUsers || allUsers.length === 0) return;
    
    const forumQuery = query(collection(firestore, 'conversations'), where('isGlobal', '==', true), where('type', '==', 'group'));
    const querySnapshot = await getDocs(forumQuery);

    if (querySnapshot.empty) {
        console.log("Creating global forum...");
        const userIds = allUsers.map(u => u.id);
        const usersData = allUsers.reduce((acc, user) => {
            acc[user.id] = { name: user.name, avatarUrl: user.avatarUrl, email: user.email };
            return acc;
        }, {} as Record<string, any>);

        const newForumData: Omit<Conversation, 'id'> = {
            name: 'Geral',
            type: 'group',
            isGlobal: true,
            userIds: userIds,
            lastMessage: null,
            users: usersData,
        };
        try {
            await addDoc(collection(firestore, 'conversations'), newForumData);
        } catch (e) {
            console.error("Failed to create global forum:", e);
        }
    }
}


export default function ForumPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: allUsers } = useCollection<UserType>(usersQuery);

  useEffect(() => {
    if (user && allUsers && allUsers.length > 0) {
      ensureGlobalForumExists(firestore, allUsers);
    }
  }, [firestore, allUsers, user]);

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-theme(spacing.14)-2*theme(spacing.6))]">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Fóruns de Equipe</h1>
        <p className="text-muted-foreground">Discuta tópicos em canais abertos com sua equipe.</p>
      </header>
      <div className="flex-1 overflow-hidden rounded-lg border bg-card">
        <ChatLayout conversationType="group" />
      </div>
    </div>
  );
}

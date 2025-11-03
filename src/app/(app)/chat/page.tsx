'use client';
import { ChatLayout } from "@/components/chat/chat-layout";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";
import type { User, Chat } from "@/lib/types";
import { useEffect } from "react";


async function ensureGlobalForumExists(firestore: any, allUsers: User[]) {
    const forumQuery = query(collection(firestore, 'chats'), where('isGlobal', '==', true));
    const querySnapshot = await getDocs(forumQuery);
    if (querySnapshot.empty && allUsers.length > 0) {
        console.log("Creating global forum...");
        const userIds = allUsers.map(u => u.id);
        const usersData = allUsers.reduce((acc, user) => {
            acc[user.id] = { name: user.name, avatarUrl: user.avatarUrl, email: user.email };
            return acc;
        }, {} as Record<string, any>);

        const newForumData: Omit<Chat, 'id'> = {
            name: 'Geral',
            type: 'forum',
            isGlobal: true,
            userIds: userIds,
            lastMessage: null,
            users: usersData,
        };
        await addDoc(collection(firestore, 'chats'), newForumData);
    }
}


export default function ChatPage() {
  const firestore = useFirestore();
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: allUsers } = useCollection<User>(usersQuery);

  useEffect(() => {
      if (firestore && allUsers && allUsers.length > 0) {
        ensureGlobalForumExists(firestore, allUsers);
      }
  }, [firestore, allUsers]);

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-theme(spacing.14)-2*theme(spacing.6))]">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Chat Interno & Fóruns</h1>
        <p className="text-muted-foreground">Colabore com sua equipe em tempo real.</p>
      </header>
      <div className="flex-1 overflow-hidden rounded-lg border bg-card">
        <ChatLayout />
      </div>
    </div>
  );
}

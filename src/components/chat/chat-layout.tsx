
'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { User, Message, Conversation } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Paperclip, Send, Hash, PlusCircle, Archive } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, orderBy, doc, setDoc, updateDoc } from 'firebase/firestore';
import React from 'react';

interface ChatLayoutProps {
  conversationType: 'direct' | 'group';
}

function GroupMembers({ userIds }: { userIds: string[] }) {
    const firestore = useFirestore();
    const usersQuery = useMemoFirebase(() => {
        if (!firestore || userIds.length === 0) return null;
        return query(collection(firestore, 'users'), where('__name__', 'in', userIds.slice(0, 10)));
    }, [firestore, userIds]);
    const { data: users, isLoading } = useCollection<User>(usersQuery);

    if (isLoading) return <div className="h-6 w-16 rounded-full bg-muted" />;
    if (!users) return null;

    const remainingCount = userIds.length - users.length;

    return (
        <div className="flex items-center -space-x-2 overflow-hidden">
            {users.map(user => (
                <Avatar key={user.id} className="h-6 w-6 border-2 border-card">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
            ))}
            {remainingCount > 0 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium text-muted-foreground">
                    +{remainingCount}
                </div>
            )}
        </div>
    )
}

export function ChatLayout({ conversationType }: ChatLayoutProps) {
  return null;
}

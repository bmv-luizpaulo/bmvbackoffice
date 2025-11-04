'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { User, Message, Chat, Forum } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Paperclip, Send, Hash } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, orderBy, doc, setDoc, updateDoc } from 'firebase/firestore';
import React from 'react';

type Conversation = Chat | Forum;

interface ChatLayoutProps {
  chatType: 'direct' | 'forum';
}

function ForumMembers({ userIds }: { userIds: string[] }) {
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

export function ChatLayout({ chatType }: ChatLayoutProps) {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messageEndRef = useRef<HTMLDivElement>(null);

  const collectionName = chatType === 'direct' ? 'chats' : 'forums';

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: allUsers } = useCollection<User>(usersQuery);

  const conversationsQuery = useMemoFirebase(() => {
    if (!firestore || !currentUser?.uid) return null;
    return query(
      collection(firestore, collectionName),
      where('userIds', 'array-contains', currentUser.uid)
    );
  }, [firestore, currentUser, collectionName]);

  const { data: conversations, isLoading: isLoadingConversations } = useCollection<Conversation>(conversationsQuery);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedConversation?.id) return null;
    return query(collection(firestore, collectionName, selectedConversation.id, 'messages'), orderBy('timestamp', 'asc'));
  }, [firestore, selectedConversation, collectionName]);
  const { data: messages, isLoading: isLoadingMessages } = useCollection<Message>(messagesQuery);
  
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !currentUser || !firestore) return;

    const messagesCollection = collection(firestore, collectionName, selectedConversation.id, 'messages');
    
    const timestamp = new Date();

    await addDoc(messagesCollection, {
      chatId: selectedConversation.id,
      senderId: currentUser.uid,
      text: newMessage,
      timestamp: timestamp,
      read: false,
    });
    
    const chatRef = doc(firestore, collectionName, selectedConversation.id);
    await updateDoc(chatRef, {
        lastMessage: {
            text: newMessage,
            timestamp: timestamp,
            senderId: currentUser.uid
        }
    });

    setNewMessage('');
  }, [newMessage, selectedConversation, currentUser, firestore, collectionName]);

  const handleSelectConversation = useCallback(async (convOrUser: Conversation | User) => {
      if (!currentUser?.uid || !firestore || !allUsers) return;

      if ('userIds' in convOrUser) { // It's a Conversation object
          setSelectedConversation(convOrUser);
          return;
      }
      
      // It's a User object, find or create direct chat
      const user = convOrUser;
      const existingChat = conversations?.find(c => c.userIds.length === 2 && c.userIds.includes(user.id));
      if (existingChat) {
          setSelectedConversation(existingChat);
          return;
      }

      const currentUserData = allUsers.find(u => u.id === currentUser.uid);
      if (!currentUserData) return;
      
      const newChatData: Omit<Chat, 'id'> = {
          userIds: [currentUser.uid, user.id],
          lastMessage: null,
          users: {
              [currentUser.uid]: {
                  name: currentUserData.name,
                  avatarUrl: currentUserData.avatarUrl,
                  email: currentUserData.email,
              },
              [user.id]: {
                  name: user.name,
                  avatarUrl: user.avatarUrl,
                  email: user.email
              }
          }
      };
      
      const newChatRef = doc(collection(firestore, 'chats'));
      await setDoc(newChatRef, newChatData);
      setSelectedConversation({ id: newChatRef.id, ...newChatData } as Chat);
  }, [currentUser, firestore, conversations, allUsers]);
  
  const conversationDisplayInfo = useMemo(() => {
    if (!selectedConversation || !currentUser) return { avatar: null, name: 'Selecione uma conversa' };
    
    if (chatType === 'forum') {
        const forum = selectedConversation as Forum;
        return { 
            avatar: <Avatar><AvatarFallback><Hash /></AvatarFallback></Avatar>,
            name: forum.name || 'Fórum' 
        };
    }
    
    const chat = selectedConversation as Chat;
    const otherUserId = chat.userIds.find(id => id !== currentUser.uid);
    if (!otherUserId || !chat.users) return { avatar: null, name: 'Carregando...' };;
    const otherUser = chat.users[otherUserId];
    return {
        avatar: <Avatar><AvatarImage src={otherUser.avatarUrl} /><AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback></Avatar>,
        name: otherUser.name
    };
  }, [selectedConversation, currentUser, chatType]);

  const directMessageUsers = useMemo(() => allUsers?.filter(u => u.id !== currentUser?.uid) || [], [allUsers, currentUser]);

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r">
        <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">{chatType === 'direct' ? 'Conversas' : 'Fóruns'}</h2>
        </div>
        <ScrollArea className="h-[calc(100%-65px)]">
            {isLoadingConversations ? (
              <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
            ) : (
                <div className="p-2">
                    {chatType === 'forum' && conversations?.map(conv => (
                      <button
                          key={conv.id}
                          className={cn(
                              "flex w-full items-center gap-3 p-2 rounded-md text-left hover:bg-muted/50 transition-colors",
                              selectedConversation?.id === conv.id && "bg-muted"
                          )}
                          onClick={() => handleSelectConversation(conv)}
                      >
                          <Avatar><AvatarFallback><Hash /></AvatarFallback></Avatar>
                          <div className='min-w-0 flex-1'>
                              <p className="font-semibold truncate">{(conv as Forum).name}</p>
                              <p className="text-sm text-muted-foreground truncate">{conv.lastMessage?.text || 'Nenhuma mensagem recente'}</p>
                          </div>
                          <ForumMembers userIds={conv.userIds} />
                      </button>
                    ))}
                    {chatType === 'direct' && directMessageUsers.map(user => {
                        const chatWithUser = conversations?.find(c => c.userIds.includes(user.id));
                        return (
                            <button
                                key={user.id}
                                className={cn(
                                    "flex w-full items-center gap-3 p-2 rounded-md text-left hover:bg-muted/50 transition-colors",
                                    selectedConversation?.id === chatWithUser?.id && "bg-muted"
                                )}
                                onClick={() => handleSelectConversation(user)}
                            >
                                <Avatar>
                                    <AvatarImage src={user.avatarUrl} />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className='min-w-0'>
                                    <p className="font-semibold truncate">{user.name}</p>
                                    <p className="text-sm text-muted-foreground truncate">{chatWithUser?.lastMessage?.text || user.email}</p>
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}
        </ScrollArea>
      </div>
      <div className="w-2/3 flex flex-col">
        {selectedConversation ? (
            <>
                <div className="flex items-center gap-3 p-4 border-b">
                    {conversationDisplayInfo.avatar}
                    <div>
                        <p className="font-semibold">{conversationDisplayInfo.name}</p>
                    </div>
                </div>
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                        {isLoadingMessages ? <p className='text-center text-muted-foreground'>Carregando mensagens...</p> : messages?.map(msg => {
                            const sender = selectedConversation.users?.[msg.senderId];
                            const isCurrentUserSender = msg.senderId === currentUser?.uid;
                            return (
                             <div key={msg.id} className={cn("flex items-end gap-2", isCurrentUserSender ? "justify-end" : "justify-start")}>
                                 {!isCurrentUserSender && <Avatar className="h-8 w-8"><AvatarImage src={sender?.avatarUrl} /><AvatarFallback>{sender?.name?.charAt(0)}</AvatarFallback></Avatar>}
                                 <div className={cn("max-w-xs lg:max-w-md rounded-lg p-3 text-sm", isCurrentUserSender ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                    {!isCurrentUserSender && chatType === 'forum' && <p className='text-xs font-bold mb-1 text-primary'>{sender?.name || 'Usuário'}</p>}
                                    <p className='whitespace-pre-wrap'>{msg.text}</p>
                                    <p className={cn("text-xs mt-1 text-right", isCurrentUserSender ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
                                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'enviando...'}
                                    </p>
                                 </div>
                             </div>
                            )
                        })}
                    </div>
                    <div ref={messageEndRef} />
                </ScrollArea>
                <div className="p-4 border-t bg-background">
                    <form onSubmit={handleSendMessage} className="relative">
                        <Input 
                            placeholder="Digite uma mensagem..." 
                            className="pr-24"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            autoComplete='off'
                        />
                        <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                            <Button type="button" variant="ghost" size="icon" disabled>
                                <Paperclip className="h-5 w-5"/>
                            </Button>
                            <Button type="submit" variant="ghost" size="icon" disabled={!newMessage.trim()}>
                                <Send className="h-5 w-5 text-primary"/>
                            </Button>
                        </div>
                    </form>
                </div>
            </>
        ) : (
             <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                    <p className="text-lg font-semibold">Selecione uma conversa</p>
                    <p className="text-muted-foreground">Escolha um contato ou um fórum para começar a conversar.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

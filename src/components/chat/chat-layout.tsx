'use client';

import { useState, useMemo, useCallback } from 'react';
import type { User, Message, Chat } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Paperclip, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, orderBy, doc, setDoc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import React from 'react';

export function ChatLayout() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState('');

  // 1. Fetch all users to display in the list
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: allUsers } = useCollection<User>(usersQuery);

  // 2. Fetch all chats the current user is a part of
  const chatsQuery = useMemoFirebase(() => {
    if (!firestore || !currentUser?.uid) return null;
    return query(collection(firestore, 'chats'), where('userIds', 'array-contains', currentUser.uid));
  }, [firestore, currentUser]);
  const { data: userChats, isLoading: isLoadingChats } = useCollection<Chat>(chatsQuery);

  // 3. Fetch messages for the currently selected chat
  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedChat?.id) return null;
    return query(collection(firestore, 'chats', selectedChat.id, 'messages'), orderBy('timestamp', 'asc'));
  }, [firestore, selectedChat]);
  const { data: messages, isLoading: isLoadingMessages } = useCollection<Message>(messagesQuery);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !currentUser || !firestore) return;

    const messagesCollection = collection(firestore, 'chats', selectedChat.id, 'messages');
    
    // This is a core user action, so we can await it to clear the input confidently.
    await addDoc(messagesCollection, {
      chatId: selectedChat.id,
      senderId: currentUser.uid,
      text: newMessage,
      timestamp: serverTimestamp(),
      read: false,
    });
    
    setNewMessage('');
  }, [newMessage, selectedChat, currentUser, firestore]);

  const handleSelectUser = useCallback(async (user: User) => {
      if (!currentUser?.uid || !firestore || !allUsers) return;
      
      // Check if a chat already exists
      const existingChat = userChats?.find(c => c.userIds.length === 2 && c.userIds.includes(user.id));
      if (existingChat) {
          setSelectedChat(existingChat);
          return;
      }

      // Create a new chat if it doesn't exist
      const currentUserData = allUsers.find(u => u.id === currentUser.uid);
      if (!currentUserData) return;
      
      const newChatData = {
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
      setSelectedChat({ id: newChatRef.id, ...newChatData } as Chat);
  }, [currentUser, firestore, userChats, allUsers]);
  
  const otherUser = useMemo(() => {
    if (!selectedChat || !currentUser) return null;
    const otherUserId = selectedChat.userIds.find(id => id !== currentUser.uid);
    if (!otherUserId || !selectedChat.users) return null;
    return selectedChat.users[otherUserId];
  }, [selectedChat, currentUser]);


  const otherUsersInList = useMemo(() => allUsers?.filter(u => u.id !== currentUser?.uid) || [], [allUsers, currentUser]);

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r">
        <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Conversas</h2>
        </div>
        <ScrollArea className="h-[calc(100%-65px)]">
            {isLoadingChats ? (
              <div className="p-4 text-sm text-muted-foreground">Carregando conversas...</div>
            ) : otherUsersInList.map(user => {
                const chatWithUser = userChats?.find(c => c.userIds.includes(user.id));
                return (
                    <button
                        key={user.id}
                        className={cn(
                            "flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors",
                            selectedChat?.id === chatWithUser?.id && "bg-muted"
                        )}
                        onClick={() => handleSelectUser(user)}
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
        </ScrollArea>
      </div>
      <div className="w-2/3 flex flex-col">
        {selectedChat && otherUser ? (
            <>
                <div className="flex items-center gap-3 p-4 border-b">
                    <Avatar>
                        <AvatarImage src={otherUser.avatarUrl} />
                        <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{otherUser.name}</p>
                        {/* Static "Online" status for simplicity */}
                        <p className="text-sm text-muted-foreground">Online</p>
                    </div>
                </div>
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                        {isLoadingMessages ? <p className='text-center text-muted-foreground'>Carregando mensagens...</p> : messages?.map(msg => {
                            const sender = selectedChat.users[msg.senderId];
                            const isCurrentUserSender = msg.senderId === currentUser?.uid;
                            return (
                             <div key={msg.id} className={cn("flex items-end gap-2", isCurrentUserSender ? "justify-end" : "justify-start")}>
                                 {!isCurrentUserSender && <Avatar className="h-8 w-8"><AvatarImage src={sender?.avatarUrl} /><AvatarFallback>{sender?.name?.charAt(0)}</AvatarFallback></Avatar>}
                                 <div className={cn("max-w-xs rounded-lg p-3 text-sm", isCurrentUserSender ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                    <p className='whitespace-pre-wrap'>{msg.text}</p>
                                    <p className={cn("text-xs mt-1 text-right", isCurrentUserSender ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'enviando...'}
                                    </p>
                                 </div>
                             </div>
                            )
                        })}
                    </div>
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
                    <p className="text-muted-foreground">Escolha um usuário na lista à esquerda para começar a conversar.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

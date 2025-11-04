'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { User, Message, Chat } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Paperclip, Send, Hash } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, orderBy, doc, setDoc, updateDoc } from 'firebase/firestore';
import React from 'react';
import { Separator } from '../ui/separator';

interface ChatLayoutProps {
  chatType: 'direct' | 'forum';
}

export function ChatLayout({ chatType }: ChatLayoutProps) {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messageEndRef = useRef<HTMLDivElement>(null);

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: allUsers } = useCollection<User>(usersQuery);

  const allChatsQuery = useMemoFirebase(() => {
    if (!firestore || !currentUser?.uid) return null;
    return query(
      collection(firestore, 'chats'),
      where('userIds', 'array-contains', currentUser.uid)
    );
  }, [firestore, currentUser]);

  const { data: allUserChats, isLoading: isLoadingChats } = useCollection<Chat>(allChatsQuery);

  const userChats = useMemo(() => {
    return allUserChats?.filter(chat => chat.type === chatType) ?? [];
  }, [allUserChats, chatType]);


  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedChat?.id) return null;
    return query(collection(firestore, 'chats', selectedChat.id, 'messages'), orderBy('timestamp', 'asc'));
  }, [firestore, selectedChat]);
  const { data: messages, isLoading: isLoadingMessages } = useCollection<Message>(messagesQuery);
  
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !currentUser || !firestore) return;

    const messagesCollection = collection(firestore, 'chats', selectedChat.id, 'messages');
    
    const timestamp = new Date();

    await addDoc(messagesCollection, {
      chatId: selectedChat.id,
      senderId: currentUser.uid,
      text: newMessage,
      timestamp: timestamp,
      read: false,
    });
    
    const chatRef = doc(firestore, 'chats', selectedChat.id);
    await updateDoc(chatRef, {
        lastMessage: {
            text: newMessage,
            timestamp: timestamp,
            senderId: currentUser.uid
        }
    });

    setNewMessage('');
  }, [newMessage, selectedChat, currentUser, firestore]);

  const handleSelectChat = useCallback(async (chatOrUser: Chat | User) => {
      if (!currentUser?.uid || !firestore || !allUsers) return;

      if ('type' in chatOrUser) { // It's a Chat object
          setSelectedChat(chatOrUser);
          return;
      }
      
      // It's a User object, find or create direct chat
      const user = chatOrUser;
      const existingChat = userChats?.find(c => c.type === 'direct' && c.userIds.length === 2 && c.userIds.includes(user.id));
      if (existingChat) {
          setSelectedChat(existingChat);
          return;
      }

      const currentUserData = allUsers.find(u => u.id === currentUser.uid);
      if (!currentUserData) return;
      
      const newChatData: Omit<Chat, 'id'> = {
          type: 'direct',
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
  
  const chatDisplayInfo = useMemo(() => {
    if (!selectedChat || !currentUser) return { avatar: null, name: 'Selecione uma conversa' };
    
    if (selectedChat.type === 'forum') {
        return { 
            avatar: <Avatar><AvatarFallback><Hash /></AvatarFallback></Avatar>,
            name: selectedChat.name || 'Fórum' 
        };
    }
    
    const otherUserId = selectedChat.userIds.find(id => id !== currentUser.uid);
    if (!otherUserId || !selectedChat.users) return { avatar: null, name: 'Carregando...' };;
    const otherUser = selectedChat.users[otherUserId];
    return {
        avatar: <Avatar><AvatarImage src={otherUser.avatarUrl} /><AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback></Avatar>,
        name: otherUser.name
    };
  }, [selectedChat, currentUser]);

  const directMessageUsers = useMemo(() => allUsers?.filter(u => u.id !== currentUser?.uid) || [], [allUsers, currentUser]);

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r">
        <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Conversas</h2>
        </div>
        <ScrollArea className="h-[calc(100%-65px)]">
            {isLoadingChats ? (
              <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
            ) : chatType === 'forum' ? (
                <div className="p-2">
                    {userChats?.map(forum => (
                      <button
                          key={forum.id}
                          className={cn(
                              "flex w-full items-center gap-3 p-2 rounded-md text-left hover:bg-muted/50 transition-colors",
                              selectedChat?.id === forum.id && "bg-muted"
                          )}
                          onClick={() => handleSelectChat(forum)}
                      >
                          <Avatar><AvatarFallback><Hash /></AvatarFallback></Avatar>
                          <div className='min-w-0'>
                              <p className="font-semibold truncate">{forum.name}</p>
                              <p className="text-sm text-muted-foreground truncate">{forum.lastMessage?.text || 'Nenhuma mensagem recente'}</p>
                          </div>
                      </button>
                  ))}
                </div>
            ) : (
                <div className="p-2">
                    {directMessageUsers.map(user => {
                        const chatWithUser = userChats?.find(c => c.userIds.includes(user.id));
                        return (
                            <button
                                key={user.id}
                                className={cn(
                                    "flex w-full items-center gap-3 p-2 rounded-md text-left hover:bg-muted/50 transition-colors",
                                    selectedChat?.id === chatWithUser?.id && "bg-muted"
                                )}
                                onClick={() => handleSelectChat(user)}
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
        {selectedChat ? (
            <>
                <div className="flex items-center gap-3 p-4 border-b">
                    {chatDisplayInfo.avatar}
                    <div>
                        <p className="font-semibold">{chatDisplayInfo.name}</p>
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
                                 <div className={cn("max-w-xs lg:max-w-md rounded-lg p-3 text-sm", isCurrentUserSender ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                    {!isCurrentUserSender && selectedChat.type === 'forum' && <p className='text-xs font-bold mb-1 text-primary'>{sender?.name || 'Usuário'}</p>}
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

'use client';

import { useState } from 'react';
import { users, messages as initialMessages } from '@/lib/data';
import type { User, Message } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Paperclip, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const currentUser = users[0]; // Assuming Alex is the current user

export function ChatLayout() {
  const [selectedUser, setSelectedUser] = useState<User>(users[1]);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      sender: currentUser,
      recipient: selectedUser,
      text: newMessage,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const conversation = messages.filter(
    m =>
      (m.sender.id === currentUser.id && m.recipient.id === selectedUser.id) ||
      (m.sender.id === selectedUser.id && m.recipient.id === currentUser.id)
  ).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r">
        <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Conversations</h2>
        </div>
        <ScrollArea className="h-[calc(100%-65px)]">
            {users.filter(u => u.id !== currentUser.id).map(user => {
                const userAvatar = PlaceHolderImages.find(p => p.id === user.id.replace('user-', 'user'))
                return (
                    <button
                        key={user.id}
                        className={cn(
                            "flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors",
                            selectedUser.id === user.id && "bg-muted"
                        )}
                        onClick={() => setSelectedUser(user)}
                    >
                        <Avatar>
                            <AvatarImage src={user.avatarUrl} data-ai-hint={userAvatar?.imageHint} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                    </button>
                )
            })}
        </ScrollArea>
      </div>
      <div className="w-2/3 flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b">
            <Avatar>
                <AvatarImage src={selectedUser.avatarUrl} />
                <AvatarFallback>{selectedUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <p className="font-semibold">{selectedUser.name}</p>
                <p className="text-sm text-muted-foreground">Online</p>
            </div>
        </div>
        <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
                {conversation.map(msg => (
                     <div key={msg.id} className={cn("flex items-end gap-2", msg.sender.id === currentUser.id ? "justify-end" : "justify-start")}>
                         {msg.sender.id !== currentUser.id && <Avatar className="h-8 w-8"><AvatarImage src={msg.sender.avatarUrl} /><AvatarFallback>{msg.sender.name.charAt(0)}</AvatarFallback></Avatar>}
                         <div className={cn("max-w-xs rounded-lg p-3 text-sm", msg.sender.id === currentUser.id ? "bg-primary text-primary-foreground" : "bg-muted")}>
                            <p>{msg.text}</p>
                            <p className={cn("text-xs mt-1", msg.sender.id === currentUser.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                         </div>
                     </div>
                ))}
            </div>
        </ScrollArea>
        <div className="p-4 border-t bg-background">
            <form onSubmit={handleSendMessage} className="relative">
                <Input 
                    placeholder="Type a message..." 
                    className="pr-24"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                />
                <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon">
                        <Paperclip className="h-5 w-5"/>
                    </Button>
                    <Button type="submit" variant="ghost" size="icon">
                        <Send className="h-5 w-5 text-primary"/>
                    </Button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
}

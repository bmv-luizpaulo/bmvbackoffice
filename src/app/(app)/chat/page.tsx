
'use client';
import { ChatLayout } from "@/components/chat/chat-layout";

export default function ChatPage() {

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-theme(spacing.14)-2*theme(spacing.6))]">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Chat Direto</h1>
        <p className="text-muted-foreground">Converse diretamente com os membros da sua equipe.</p>
      </header>
      <div className="flex-1 overflow-hidden rounded-lg border bg-card">
        <ChatLayout conversationType="direct" />
      </div>
    </div>
  );
}

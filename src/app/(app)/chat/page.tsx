
'use client';

export default function ChatPage() {

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-theme(spacing.14)-2*theme(spacing.6))]">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Chat Direto</h1>
        <p className="text-muted-foreground">Converse diretamente com os membros da sua equipe.</p>
      </header>
      <div className="flex-1 overflow-hidden rounded-lg border bg-card">
        {/* O componente ChatLayout foi removido pois estava vazio */}
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">O chat está sendo implementado.</p>
        </div>
      </div>
    </div>
  );
}

    
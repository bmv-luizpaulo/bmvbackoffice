'use client';

import { useState } from 'react';
import { Bot, Loader2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getChatSummaryAction } from '@/lib/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ChatSummary() {
    const [summary, setSummary] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleGenerateSummary = async () => {
        setIsLoading(true);
        setSummary(null);

        const result = await getChatSummaryAction();

        if (result.success && result.data) {
            setSummary(result.data.summary);
            toast({
                title: "Resumo Gerado",
                description: "Os destaques do chat de hoje estão prontos.",
            });
        } else {
            toast({
                variant: 'destructive',
                title: "Erro",
                description: result.error || "Não foi possível gerar o resumo do chat.",
            });
        }
        setIsLoading(false);
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <Bot className="text-primary" />
                    Resumo Diário da IA
                </CardTitle>
                <CardDescription>
                    Obtenha um resumo rápido das conversas importantes de hoje.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <Button onClick={handleGenerateSummary} disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Gerando...
                        </>
                    ) : (
                        "Gerar Resumo de Hoje"
                    )}
                </Button>

                {summary && (
                     <Alert>
                        <AlertTitle className="font-bold">Destaques da Conversa</AlertTitle>
                        <AlertDescription className="whitespace-pre-wrap text-sm">
                            {summary}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}

    
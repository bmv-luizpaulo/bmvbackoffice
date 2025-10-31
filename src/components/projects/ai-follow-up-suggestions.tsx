'use client';

import { useState } from 'react';
import { Bot, Loader2, Wand2 } from 'lucide-react';
import type { Project } from '@/lib/types';
import { getFollowUpSuggestionsAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface AiFollowUpSuggestionsProps {
    project: Project;
}

export function AiFollowUpSuggestions({ project }: AiFollowUpSuggestionsProps) {
    const [suggestions, setSuggestions] = useState<string[] | null>(null);
    const [reasoning, setReasoning] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleGenerateSuggestions = async () => {
        setIsLoading(true);
        setSuggestions(null);
        setReasoning(null);

        const result = await getFollowUpSuggestionsAction(project);

        if (result.success && result.data) {
            setSuggestions(result.data.suggestedActions);
            setReasoning(result.data.reasoning);
            toast({
                title: "Sugestões Geradas",
                description: "A IA analisou o projeto e forneceu algumas ideias.",
            });
        } else {
            toast({
                variant: 'destructive',
                title: "Erro",
                description: result.error || "Não foi possível gerar as sugestões.",
            });
        }
        setIsLoading(false);
    };

    return (
        <Accordion type="single" collapsible className="w-full mb-4">
            <AccordionItem value="item-1">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Bot className="text-primary" />
                        <span className="font-semibold">Sugestões da IA para este Projeto</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="p-4 border rounded-lg bg-background/50 flex flex-col gap-4">
                         <Button onClick={handleGenerateSuggestions} disabled={isLoading} size="sm" className="self-start">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analisando...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="mr-2 h-4 w-4" />
                                    Gerar Sugestões de Acompanhamento
                                </>
                            )}
                        </Button>
                        {suggestions && (
                            <Alert>
                                <AlertTitle className="font-bold">Ações Sugeridas</AlertTitle>
                                <AlertDescription>
                                    <ul className="list-disc pl-5 space-y-1 mt-2">
                                        {suggestions.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                    {reasoning && (
                                        <div className="mt-4">
                                            <p className="font-semibold">Raciocínio da IA:</p>
                                            <p className="text-xs text-muted-foreground">{reasoning}</p>
                                        </div>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}

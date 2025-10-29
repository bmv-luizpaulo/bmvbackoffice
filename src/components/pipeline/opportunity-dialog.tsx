'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getFollowUpSuggestionsAction } from '@/lib/actions';
import { STAGES } from '@/lib/data';
import type { Opportunity } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Building,
  DollarSign,
  User,
  Mail,
  Bot,
  Loader2,
  Calendar,
  Timeline,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type OpportunityDialogProps = {
  opportunity: Opportunity;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onStageChange: (opportunityId: string, newStage: Opportunity['stage']) => void;
};

export function OpportunityDialog({
  opportunity,
  isOpen,
  onOpenChange,
  onStageChange,
}: OpportunityDialogProps) {
  const { toast } = useToast();
  const [aiSuggestions, setAiSuggestions] = useState<{ actions: string[]; reasoning: string } | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  
  const handleStageChange = (newStage: Opportunity['stage']) => {
    onStageChange(opportunity.id, newStage);
  };

  const handleGetSuggestions = async () => {
    setIsLoadingAi(true);
    setAiSuggestions(null);
    const result = await getFollowUpSuggestionsAction(opportunity);
    if (result.success && result.data) {
        setAiSuggestions({
            actions: result.data.suggestedActions,
            reasoning: result.data.reasoning
        });
    } else {
        toast({
            variant: "destructive",
            title: "Erro",
            description: result.error || "Não foi possível buscar sugestões de IA."
        })
    }
    setIsLoadingAi(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{opportunity.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Building className="h-4 w-4"/> {opportunity.company}</span>
            <span className="flex items-center gap-1.5"><DollarSign className="h-4 w-4"/> {opportunity.value.toLocaleString()}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
            <div className="md:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Bot className="text-primary"/> Acompanhamentos Sugeridos por IA</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleGetSuggestions} disabled={isLoadingAi} className="w-full">
                             {isLoadingAi ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Gerando...</> : "Sugerir Acompanhamentos"}
                        </Button>
                        {aiSuggestions && (
                            <Alert className="mt-4">
                                <AlertTitle className="font-bold">Ações Recomendadas</AlertTitle>
                                <AlertDescription>
                                    <ul className="list-disc pl-5 mt-2 space-y-1">
                                        {aiSuggestions.actions.map((action, i) => <li key={i}>{action}</li>)}
                                    </ul>
                                    <p className="mt-3 text-xs italic text-muted-foreground">{aiSuggestions.reasoning}</p>
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Timeline className="text-primary"/> Histórico de Estágios</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                        {opportunity.history.map((h, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Badge variant={h.stage === opportunity.stage ? 'default' : 'secondary'}>{h.stage}</Badge>
                                <Separator orientation="vertical" className="!h-1 flex-1 border-dashed" />
                                <span className="text-sm text-muted-foreground">{new Date(h.date).toLocaleDateString()}</span>
                            </div>
                        ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <div>
                    <h4 className="font-semibold mb-2">Estágio</h4>
                    <Select value={opportunity.stage} onValueChange={handleStageChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o estágio" />
                        </SelectTrigger>
                        <SelectContent>
                            {STAGES.map(stage => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Calendar className="h-4 w-4"/> Último Contato</h4>
                    <p className="text-sm text-muted-foreground">{new Date(opportunity.lastContact).toLocaleString()}</p>
                </div>
                <div>
                    <h4 className="font-semibold mb-2">Contatos</h4>
                    {opportunity.contacts.map(contact => (
                        <div key={contact.id} className="text-sm space-y-1 rounded-md border p-3">
                            <p className="font-medium flex items-center gap-2"><User className="h-4 w-4"/> {contact.name}</p>
                            <p className="text-muted-foreground">{contact.role}</p>
                            <a href={`mailto:${contact.email}`} className="text-primary hover:underline flex items-center gap-2">
                               <Mail className="h-4 w-4"/> {contact.email}
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

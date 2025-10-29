'use server';

import { getSuggestedFollowUps } from "@/ai/flows/ai-suggested-follow-ups";
import { generateDailyChatSummary } from "@/ai/flows/daily-chat-summary";
import { Opportunity } from "./types";
import { chatLogForSummary } from "./data";

export async function getFollowUpSuggestionsAction(opportunity: Opportunity) {
    try {
        const opportunityDetails = `
            Título: ${opportunity.title}
            Empresa: ${opportunity.company}
            Valor: R$${opportunity.value.toLocaleString('pt-BR')}
            Contatos: ${opportunity.contacts.map(c => `${c.name} (${c.role})`).join(', ')}
            Último Contato: ${new Date(opportunity.lastContact).toLocaleDateString()}
            Histórico: ${opportunity.history.map(h => `${h.stage} em ${new Date(h.date).toLocaleDateString()}`).join(' -> ')}
        `;

        const result = await getSuggestedFollowUps({
            opportunityDetails,
            currentPipelineStage: opportunity.stage,
            pastFollowUpActions: `O último contato foi em ${new Date(opportunity.lastContact).toLocaleDateString()}. A oportunidade está atualmente no estágio de ${opportunity.stage}.`
        });
        
        return { success: true, data: result };
    } catch (error) {
        console.error("Erro ao obter sugestões de IA:", error);
        return { success: false, error: "Falha ao obter sugestões de IA." };
    }
}

export async function getChatSummaryAction() {
    try {
        const result = await generateDailyChatSummary({
            chatLog: chatLogForSummary
        });
        return { success: true, data: result };
    } catch (error) {
        console.error("Erro ao gerar resumo do chat:", error);
        return { success: false, error: "Falha ao gerar resumo do chat." };
    }
}

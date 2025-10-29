'use server';

import { getSuggestedFollowUps } from "@/ai/flows/ai-suggested-follow-ups";
import { generateDailyChatSummary } from "@/ai/flows/daily-chat-summary";
import { chatLogForSummary } from "./data";
import type { Project } from "./types";

export async function getFollowUpSuggestionsAction(project: Project) {
    try {
        const opportunityDetails = `
            Título: ${project.name}
            Descrição: ${project.description}
            Data de Início: ${new Date(project.startDate).toLocaleDateString()}
            Responsável: ${project.ownerId}
        `;

        const result = await getSuggestedFollowUps({
            opportunityDetails,
            currentPipelineStage: "Em Progresso", // Placeholder
            pastFollowUpActions: `O projeto foi iniciado em ${new Date(project.startDate).toLocaleDateString()}.`
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

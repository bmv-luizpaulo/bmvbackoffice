'use server';

import { getSuggestedFollowUps } from "@/ai/flows/ai-suggested-follow-ups";
import { generateDailyChatSummary } from "@/ai/flows/daily-chat-summary";
import { chatLogForSummary } from "./data";
import type { Project } from "./types";
import { getDocs, collection, query, where } from 'firebase/firestore';
import { initializeFirebase } from "@/firebase";

export async function getFollowUpSuggestionsAction(project: Project) {
    try {
        const { firestore } = initializeFirebase();
        const tasksCollection = collection(firestore, `projects/${project.id}/tasks`);
        const tasksSnapshot = await getDocs(tasksCollection);
        const tasks = tasksSnapshot.docs.map(doc => doc.data());

        const openTasks = tasks.filter(task => !task.isCompleted).map(task => `- ${task.name}`).join('\n');

        const opportunityDetails = `
            Título do Projeto: ${project.name}
            Descrição: ${project.description}
            Data de Início: ${new Date(project.startDate).toLocaleDateString()}
            Tarefas Abertas: 
            ${openTasks || 'Nenhuma'}
        `;

        const result = await getSuggestedFollowUps({
            opportunityDetails,
            currentPipelineStage: "Em Andamento", 
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

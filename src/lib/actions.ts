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

type ViaCepResponse = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
};

export async function getCepInfoAction(cep: string): Promise<{ success: boolean; data?: Partial<ViaCepResponse>; error?: string }> {
    const cepDigits = cep.replace(/\D/g, '');
    if (cepDigits.length !== 8) {
        return { success: false, error: "CEP inválido." };
    }

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
        if (!response.ok) {
            throw new Error('Falha ao buscar o CEP.');
        }
        const data: ViaCepResponse = await response.json();
        if (data.erro) {
            return { success: false, error: "CEP não encontrado." };
        }
        return { success: true, data };
    } catch (error) {
        console.error("Erro ao buscar CEP na ViaCEP:", error);
        return { success: false, error: "Não foi possível buscar o CEP." };
    }
}

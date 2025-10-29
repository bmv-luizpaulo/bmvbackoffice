'use server';

import { getSuggestedFollowUps } from "@/ai/flows/ai-suggested-follow-ups";
import { generateDailyChatSummary } from "@/ai/flows/daily-chat-summary";
import { Opportunity } from "./types";
import { chatLogForSummary } from "./data";

export async function getFollowUpSuggestionsAction(opportunity: Opportunity) {
    try {
        const opportunityDetails = `
            Title: ${opportunity.title}
            Company: ${opportunity.company}
            Value: $${opportunity.value.toLocaleString()}
            Contacts: ${opportunity.contacts.map(c => `${c.name} (${c.role})`).join(', ')}
            Last Contact: ${new Date(opportunity.lastContact).toLocaleDateString()}
            History: ${opportunity.history.map(h => `${h.stage} on ${new Date(h.date).toLocaleDateString()}`).join(' -> ')}
        `;

        const result = await getSuggestedFollowUps({
            opportunityDetails,
            currentPipelineStage: opportunity.stage,
            pastFollowUpActions: `Last contact was on ${new Date(opportunity.lastContact).toLocaleDateString()}. The opportunity is currently in the ${opportunity.stage} stage.`
        });
        
        return { success: true, data: result };
    } catch (error) {
        console.error("Error getting AI suggestions:", error);
        return { success: false, error: "Failed to get AI suggestions." };
    }
}

export async function getChatSummaryAction() {
    try {
        const result = await generateDailyChatSummary({
            chatLog: chatLogForSummary
        });
        return { success: true, data: result };
    } catch (error) {
        console.error("Error generating chat summary:", error);
        return { success: false, error: "Failed to generate chat summary." };
    }
}

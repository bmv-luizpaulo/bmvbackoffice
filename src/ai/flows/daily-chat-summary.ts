'use server';

/**
 * @fileOverview Generates a daily summary of internal chat conversations.
 *
 * - generateDailyChatSummary - A function that generates the daily chat summary.
 * - DailyChatSummaryInput - The input type for the generateDailyChatSummary function.
 * - DailyChatSummaryOutput - The return type for the generateDailyChatSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DailyChatSummaryInputSchema = z.object({
  chatLog: z
    .string()
    .describe('The complete chat log for the day to be summarized.'),
});

export type DailyChatSummaryInput = z.infer<typeof DailyChatSummaryInputSchema>;

const DailyChatSummaryOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A concise summary of the day\'s chat log, highlighting key decisions, action items, and potential roadblocks.'
    ),
});

export type DailyChatSummaryOutput = z.infer<typeof DailyChatSummaryOutputSchema>;

export async function generateDailyChatSummary(
  input: DailyChatSummaryInput
): Promise<DailyChatSummaryOutput> {
  return dailyChatSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dailyChatSummaryPrompt',
  input: {schema: DailyChatSummaryInputSchema},
  output: {schema: DailyChatSummaryOutputSchema},
  prompt: `You are an AI assistant tasked with summarizing internal chat logs for a team lead.

  Your goal is to provide a concise overview of the day's conversations, highlighting:

  - Key decisions that were made.
  - Action items that were assigned or agreed upon.
  - Any potential roadblocks or issues that were identified.

  Use the following chat log to create the summary:

  Chat Log:
  {{chatLog}}`,
});

const dailyChatSummaryFlow = ai.defineFlow(
  {
    name: 'dailyChatSummaryFlow',
    inputSchema: DailyChatSummaryInputSchema,
    outputSchema: DailyChatSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

'use server';

/**
 * @fileOverview Gera um resumo diário das conversas de chat internas.
 *
 * - generateDailyChatSummary - Uma função que gera o resumo diário do chat.
 * - DailyChatSummaryInput - O tipo de entrada para a função generateDailyChatSummary.
 * - DailyChatSummaryOutput - O tipo de retorno para a função generateDailyChatSummary.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DailyChatSummaryInputSchema = z.object({
  chatLog: z
    .string()
    .describe('O registro completo de chat do dia a ser resumido.'),
});

export type DailyChatSummaryInput = z.infer<typeof DailyChatSummaryInputSchema>;

const DailyChatSummaryOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'Um resumo conciso do registro de chat do dia, destacando as principais decisões, itens de ação e possíveis obstáculos.'
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
  prompt: `Você é um assistente de IA encarregado de resumir os registros de chat internos para um líder de equipe.

  Seu objetivo é fornecer uma visão geral concisa das conversas do dia, destacando:

  - Principais decisões que foram tomadas.
  - Itens de ação que foram atribuídos ou acordados.
  - Quaisquer possíveis obstáculos ou problemas que foram identificados.

  Use o seguinte registro de chat para criar o resumo:

  Registro de Chat:
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

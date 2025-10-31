'use server';
/**
 * @fileOverview Sugestões de acompanhamento baseadas em IA para oportunidades de vendas.
 *
 * - getSuggestedFollowUps - Uma função que analisa o pipeline de vendas e sugere ações de acompanhamento.
 * - SuggestedFollowUpsInput - O tipo de entrada para a função getSuggestedFollowUps.
 * - SuggestedFollowUpsOutput - O tipo de retorno para a função getSuggestedFollowUps.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestedFollowUpsInputSchema = z.object({
  opportunityDetails: z
    .string()
    .describe('Informações detalhadas sobre a oportunidade de vendas, incluindo histórico de comunicação, tamanho do negócio, estágio e principais partes interessadas.'),
  currentPipelineStage: z.string().describe('O estágio atual da oportunidade no pipeline de vendas.'),
  pastFollowUpActions: z
    .string()
    .describe('Um resumo das ações de acompanhamento anteriores tomadas e seus resultados.'),
});
export type SuggestedFollowUpsInput = z.infer<typeof SuggestedFollowUpsInputSchema>;

const SuggestedFollowUpsOutputSchema = z.object({
  suggestedActions: z
    .array(z.string())
    .describe('Uma lista de 2 a 3 ações de acompanhamento sugeridas, com etapas claras e acionáveis.'),
  reasoning: z
    .string()
    .describe('O raciocínio da IA para sugerir essas ações, explicando por que elas são os próximos melhores passos.'),
});
export type SuggestedFollowUpsOutput = z.infer<typeof SuggestedFollowUpsOutputSchema>;

export async function getSuggestedFollowUps(input: SuggestedFollowUpsInput): Promise<SuggestedFollowUpsOutput> {
  return suggestedFollowUpsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestedFollowUpsPrompt',
  input: {schema: SuggestedFollowUpsInputSchema},
  output: {schema: SuggestedFollowUpsOutputSchema},
  prompt: `Você é um assistente de IA que ajuda os gerentes de vendas a priorizar os esforços de sua equipe, sugerindo ações de acompanhamento relevantes para cada oportunidade de venda.

  Analise os detalhes da oportunidade fornecidos, o estágio atual do pipeline e as ações de acompanhamento anteriores para sugerir as próximas melhores ações.

  Detalhes da Oportunidade: {{{opportunityDetails}}}
Estágio Atual do Pipeline: {{{currentPipelineStage}}}
Ações de Acompanhamento Anteriores: {{{pastFollowUpActions}}}

  Considere estes fatores ao formular suas sugestões:
  - A probabilidade de fechar o negócio com base no estágio atual e nas interações anteriores.
  - O impacto potencial de cada ação para avançar a oportunidade.
  - A relevância da ação para a oportunidade específica e suas partes interessadas.

  Forneça uma lista de 2 a 3 ações de acompanhamento sugeridas e o raciocínio por trás de cada sugestão.
  Formate a saída para ser concisa, com etapas claras e acionáveis.
  `,
});

const suggestedFollowUpsFlow = ai.defineFlow(
  {
    name: 'suggestedFollowUpsFlow',
    inputSchema: SuggestedFollowUpsInputSchema,
    outputSchema: SuggestedFollowUpsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

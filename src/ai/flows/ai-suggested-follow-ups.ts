'use server';
/**
 * @fileOverview AI-powered follow-up suggestions for sales opportunities.
 *
 * - getSuggestedFollowUps - A function that analyzes the sales pipeline and suggests follow-up actions.
 * - SuggestedFollowUpsInput - The input type for the getSuggestedFollowUps function.
 * - SuggestedFollowUpsOutput - The return type for the getSuggestedFollowUps function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestedFollowUpsInputSchema = z.object({
  opportunityDetails: z
    .string()
    .describe('Detailed information about the sales opportunity, including communication history, deal size, stage, and key stakeholders.'),
  currentPipelineStage: z.string().describe('The current stage of the opportunity in the sales pipeline.'),
  pastFollowUpActions: z
    .string()
    .describe('A summary of past follow-up actions taken and their outcomes.'),
});
export type SuggestedFollowUpsInput = z.infer<typeof SuggestedFollowUpsInputSchema>;

const SuggestedFollowUpsOutputSchema = z.object({
  suggestedActions: z
    .array(z.string())
    .describe('A list of suggested follow-up actions, with clear and actionable steps.'),
  reasoning: z
    .string()
    .describe('The AI’s reasoning for suggesting these actions, including the factors considered.'),
});
export type SuggestedFollowUpsOutput = z.infer<typeof SuggestedFollowUpsOutputSchema>;

export async function getSuggestedFollowUps(input: SuggestedFollowUpsInput): Promise<SuggestedFollowUpsOutput> {
  return suggestedFollowUpsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestedFollowUpsPrompt',
  input: {schema: SuggestedFollowUpsInputSchema},
  output: {schema: SuggestedFollowUpsOutputSchema},
  prompt: `You are an AI assistant helping sales managers prioritize their team\'s efforts by suggesting relevant follow-up actions for each sales opportunity.

  Analyze the provided opportunity details, current pipeline stage, and past follow-up actions to suggest the next best actions.

  Opportunity Details: {{{opportunityDetails}}}
Current Pipeline Stage: {{{currentPipelineStage}}}
Past Follow-Up Actions: {{{pastFollowUpActions}}}

  Consider these factors when formulating your suggestions:
  - The likelihood of closing the deal based on the current stage and past interactions.
  - The potential impact of each action on moving the opportunity forward.
  - The relevance of the action to the specific opportunity and its stakeholders.

  Provide a list of suggested follow-up actions and the reasoning behind each suggestion.
  Format the output to be concise, with clear and actionable steps.
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

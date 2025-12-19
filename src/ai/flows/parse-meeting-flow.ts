
'use client';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { MeetingDetails } from '@/lib/types';

/**
 * @fileoverview This flow parses a natural language query to extract meeting details.
 */

const MeetingDetailsSchema = z.object({
  name: z.string().describe('The name or title of the meeting.'),
  startDate: z
    .string()
    .describe(
      'The start date and time of the meeting in ISO 8601 format.'
    ),
  endDate: z
    .string()
    .optional()
    .describe(
      'The end date and time of the meeting in ISO 8601 format, if available.'
    ),
  meetLink: z
    .string()
    .optional()
    .describe('The Google Meet link for the meeting, if available.'),
});

const ParseMeetingInputSchema = z.object({
  query: z.string().describe('The natural language text to parse for meeting details.'),
});
export type ParseMeetingInput = z.infer<typeof ParseMeetingInputSchema>;

export type ParseMeetingOutput = MeetingDetails;


const parseMeetingPrompt = ai.definePrompt({
  name: 'parseMeetingPrompt',
  input: { schema: ParseMeetingInputSchema },
  output: { schema: MeetingDetailsSchema },
  prompt: `
    You are an expert at parsing natural language to extract structured meeting information.
    Analyze the following query and extract the meeting details.

    The current year is ${new Date().getFullYear()}.

    Query: {{{query}}}
  `,
});


const parseMeetingFlow = ai.defineFlow(
  {
    name: 'parseMeetingFlow',
    inputSchema: ParseMeetingInputSchema,
    outputSchema: MeetingDetailsSchema,
  },
  async (input) => {
    const { output } = await parseMeetingPrompt(input);
    return output!;
  }
);


export async function parseMeeting(input: ParseMeetingInput): Promise<ParseMeetingOutput> {
  return parseMeetingFlow(input);
}

    
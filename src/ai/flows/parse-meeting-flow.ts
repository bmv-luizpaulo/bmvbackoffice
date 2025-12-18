'use server';

import { z } from 'zod';
import { genkit, configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { MeetingDetails } from '@/lib/types';
import { config } from 'dotenv';

config();

configureGenkit({
  plugins: [
    googleAI({
      apiVersion: ['v1', 'v1beta'],
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});


const MeetingDetailsSchema = z.object({
  name: z.string().describe('O título ou assunto principal da reunião.'),
  startDate: z
    .string()
    .describe(
      'A data e hora de início da reunião, no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ). Se o ano não for especificado, use o ano atual.'
    ),
  endDate: z
    .string()
    .describe(
      'A data e hora de término da reunião, no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ). Se o ano não for especificado, use o ano atual.'
    )
    .optional(),
  meetLink: z
    .string()
    .url()
    .describe('O link da videochamada do Google Meet.')
    .optional(),
});

const MeetingParseInputSchema = z.object({
  meetingText: z.string(),
  currentDateTime: z.string(),
});

const parseMeetingDetailsPrompt = genkit.definePrompt({
  name: 'parseMeetingDetailsPrompt',
  input: { schema: MeetingParseInputSchema },
  output: { schema: MeetingDetailsSchema },
  prompt: `Você é um assistente especialista em extrair informações de convites de reunião. Analise o texto a seguir e extraia o título, a data e hora de início, a data e hora de término (se houver) e o link do Google Meet.

Considere o seguinte:
- A data e hora atual para referência é: {{{currentDateTime}}}. Se o ano não for especificado no texto, presuma o ano atual.
- O formato da data e hora de saída deve ser estritamente ISO 8601 (por exemplo, 2024-07-25T14:00:00.000Z).
- Se o fuso horário for 'America/Sao_Paulo', converta para UTC somando 3 horas ao horário local (ex: 10:00 America/Sao_Paulo se torna 13:00 UTC). Se não houver fuso, presuma que o horário já está em UTC.
- O título deve ser o assunto principal da reunião.
- Extraia apenas o link direto da videochamada do Google Meet.

Texto do Convite:
---
{{{meetingText}}}
---
`,
});

const parseMeetingDetailsFlow = genkit.defineFlow(
  {
    name: 'parseMeetingDetailsFlow',
    inputSchema: z.string(),
    outputSchema: MeetingDetailsSchema,
  },
  async (meetingText) => {
    const currentDateTime = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
    
    const { output } = await parseMeetingDetailsPrompt({
        meetingText,
        currentDateTime,
    });
    
    if (!output) {
      throw new Error('Não foi possível extrair os detalhes da reunião.');
    }
    return output;
  }
);


export async function parseMeetingDetails(meetingText: string): Promise<MeetingDetails> {
  return parseMeetingDetailsFlow(meetingText);
}

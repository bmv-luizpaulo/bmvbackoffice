'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';

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

export type MeetingDetails = z.infer<typeof MeetingDetailsSchema>;

const parseMeetingDetailsPrompt = ai.definePrompt({
  name: 'parseMeetingDetailsPrompt',
  input: { schema: z.string() },
  output: { schema: MeetingDetailsSchema },
  prompt: `Você é um assistente especialista em extrair informações de convites de reunião. Analise o texto a seguir e extraia o título, a data e hora de início, a data e hora de término (se houver) e o link do Google Meet.

Considere o seguinte:
- A data e hora atual para referência é: ${format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}. Se o ano não for especificado no texto, presuma o ano atual.
- O formato da data e hora de saída deve ser estritamente ISO 8601 (por exemplo, 2024-07-25T14:00:00.000Z). Converta o fuso horário 'America/Sao_Paulo' para UTC, que é 3 horas adiantado (ex: 10:00 America/Sao_Paulo se torna 13:00 UTC).
- O título deve ser o assunto principal da reunião.
- Extraia apenas o link direto da videochamada do Google Meet.

Texto do Convite:
---
{{{input}}}
---
`,
});

export const parseMeetingDetailsFlow = ai.defineFlow(
  {
    name: 'parseMeetingDetailsFlow',
    inputSchema: z.string(),
    outputSchema: MeetingDetailsSchema,
  },
  async (meetingText) => {
    const { output } = await parseMeetingDetailsPrompt(meetingText);
    if (!output) {
      throw new Error('Não foi possível extrair os detalhes da reunião.');
    }
    return output;
  }
);

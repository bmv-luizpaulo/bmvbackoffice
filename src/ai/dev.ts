'use server';
import { config } from 'dotenv';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

config();

const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: ['v1', 'v1beta'],
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export { ai };

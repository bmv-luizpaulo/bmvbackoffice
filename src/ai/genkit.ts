
'use server';

import { genkit, type GenkitOptions } from 'genkit';
import { googleGenai } from '@genkit-ai/google-genai';

const genkitOptions: GenkitOptions = {
    plugins: [
        googleGenai({
            // Specify your API key if not set in environment variables
            // apiKey: process.env.GENAI_API_KEY,
        }),
    ],
    logSinks: [],
    enableTracingAndMetrics: true,
};

export const ai = genkit(genkitOptions);

    
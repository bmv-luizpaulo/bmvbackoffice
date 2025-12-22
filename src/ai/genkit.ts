
'use server';

import { genkit, type GenkitOptions } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const genkitOptions: GenkitOptions = {
    plugins: [
        googleAI({
            // Specify your API key if not set in environment variables
            // apiKey: process.env.GENAI_API_KEY,
        }),
    ],
};

export const ai = genkit(genkitOptions);

    
'use server';
/**
 * @fileOverview An AI agent for generating conversation subjects.
 *
 * - generateSubject - A function that generates a conversation subject.
 * - GenerateSubjectInput - The input type for the generateSubject function.
 * - GenerateSubjectOutput - The return type for the generateSubject function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateSubjectInputSchema = z.object({
  topic: z
    .string()
    .optional()
    .describe('Optional topic to guide the subject generation.'),
});
export type GenerateSubjectInput = z.infer<typeof GenerateSubjectInputSchema>;

const GenerateSubjectOutputSchema = z.object({
  subject: z.string().describe('The generated conversation subject.'),
});
export type GenerateSubjectOutput = z.infer<typeof GenerateSubjectOutputSchema>;

export async function generateSubject(input: GenerateSubjectInput): Promise<GenerateSubjectOutput> {
  return generateSubjectFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSubjectPrompt',
  input: {
    schema: z.object({
      topic: z
        .string()
        .optional()
        .describe('Optional topic to guide the subject generation.'),
    }),
  },
  output: {
    schema: z.object({
      subject: z.string().describe('The generated conversation subject.'),
    }),
  },
  prompt: `You are a creative AI assistant that specializes in generating conversation subjects for a game.

  {% if topic %}Generate a subject related to the following topic: {{{topic}}}.{% else %}Generate a random conversation subject.{% endif %}

  Subject: `,
});

const generateSubjectFlow = ai.defineFlow<
  typeof GenerateSubjectInputSchema,
  typeof GenerateSubjectOutputSchema
>({
  name: 'generateSubjectFlow',
  inputSchema: GenerateSubjectInputSchema,
  outputSchema: GenerateSubjectOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});

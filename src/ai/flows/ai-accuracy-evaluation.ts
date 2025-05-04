'use server';

/**
 * @fileOverview This file defines a Genkit flow for evaluating the accuracy of a final answer using AI.
 *
 * - evaluateAccuracy - A function that evaluates the accuracy of an answer.
 * - EvaluateAccuracyInput - The input type for the evaluateAccuracy function.
 * - EvaluateAccuracyOutput - The return type for the evaluateAccuracy function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const EvaluateAccuracyInputSchema = z.object({
  subject: z.string().describe('The subject of the game round.'),
  answer: z.string().describe('The final answer provided by the players.'),
});
export type EvaluateAccuracyInput = z.infer<typeof EvaluateAccuracyInputSchema>;

const EvaluateAccuracyOutputSchema = z.object({
  accuracyScore: z
    .number()
    .describe('The accuracy score of the answer, on a scale of 1-100.'),
  justification: z.string().describe('The AI justification for the accuracy score.'),
});
export type EvaluateAccuracyOutput = z.infer<typeof EvaluateAccuracyOutputSchema>;

export async function evaluateAccuracy(input: EvaluateAccuracyInput): Promise<EvaluateAccuracyOutput> {
  return evaluateAccuracyFlow(input);
}

const evaluateAccuracyPrompt = ai.definePrompt({
  name: 'evaluateAccuracyPrompt',
  input: {
    schema: z.object({
      subject: z.string().describe('The subject of the game round.'),
      answer: z.string().describe('The final answer provided by the players.'),
    }),
  },
  output: {
    schema: z.object({
      accuracyScore: z
        .number()
        .describe('The accuracy score of the answer, on a scale of 1-100.'),
      justification: z.string().describe('The AI justification for the accuracy score.'),
    }),
  },
  prompt: `You are an AI judge evaluating the accuracy of an answer to a subject.

  Subject: {{{subject}}}
  Answer: {{{answer}}}

  Provide an accuracy score between 1 and 100, and a justification for the score.
  `,
});

const evaluateAccuracyFlow = ai.defineFlow<
  typeof EvaluateAccuracyInputSchema,
  typeof EvaluateAccuracyOutputSchema
>(
  {
    name: 'evaluateAccuracyFlow',
    inputSchema: EvaluateAccuracyInputSchema,
    outputSchema: EvaluateAccuracyOutputSchema,
  },
  async input => {
    const {output} = await evaluateAccuracyPrompt(input);
    return output!;
  }
);

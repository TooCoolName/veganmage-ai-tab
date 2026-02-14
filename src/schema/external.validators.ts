import * as v from 'valibot';

export const GenerateTextSchema = v.object({
    prompt: v.string('Prompt is required')
});

export type GenerateText = v.InferInput<typeof GenerateTextSchema>;

import * as v from 'valibot';

export const GenerateTextSchema = v.object({
    prompt: v.string()
});

export type GenerateText = v.InferInput<typeof GenerateTextSchema>;

export const ExternalMessegeSchema = {
    ping: {
        request: v.undefined(),
        response: v.undefined()
    },
    generate_text: {
        request: GenerateTextSchema,
        response: v.string()
    }
};

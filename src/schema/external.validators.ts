import * as v from 'valibot';

export const GenerateTextSchema = v.object({
    prompt: v.string('Prompt is required')
});


export type GenerateText = v.InferInput<typeof GenerateTextSchema>;

export const PingSchema = v.undefined();

export const ExternalMessengerSchema = {
    ping: {
        request: v.optional(v.unknown()),
        response: v.undefined()
    },
    generate_text: {
        request: GenerateTextSchema,
        response: v.string()
    }
};

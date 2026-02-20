import * as v from 'valibot';

export const GenerateTextSchema = v.object({
    prompt: v.string('Prompt is required')
});


export type GenerateText = v.InferInput<typeof GenerateTextSchema>;

export const PingSchema = v.undefined();

const ApiResponseSchema = <T extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(dataSchema: T) =>
    v.union([
        v.object({ success: v.literal(true), data: dataSchema }),
        v.object({ success: v.literal(false), error: v.string() })
    ]);

export const ExternalMessengerSchema = {
    ping: {
        request: v.optional(v.unknown()),
        response: ApiResponseSchema(v.undefined())
    },
    generate_text: {
        request: GenerateTextSchema,
        response: ApiResponseSchema(v.string())
    }
}

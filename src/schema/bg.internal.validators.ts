import * as v from 'valibot';

export const BgInternalMessageSchema = {
    log: {
        request: v.object({
            action: v.literal('log'),
            payload: v.objectWithRest({
                level: v.optional(v.string()),
                msg: v.string()
            }, v.unknown())
        }),
        response: v.undefined()
    }
};

export type BgInternalMessageMap = {
    [K in keyof typeof BgInternalMessageSchema]: {
        request: v.InferInput<(typeof BgInternalMessageSchema)[K]['request']>;
        response: v.InferInput<(typeof BgInternalMessageSchema)[K]['response']>;
    }
};

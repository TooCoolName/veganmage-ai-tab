import * as v from 'valibot';

export const BgInternalMessageSchema = {
    log: {
        request: v.objectWithRest({
            level: v.optional(v.string()),
            msg: v.string()
        }, v.unknown()),
        response: v.undefined()
    }
};

export type BgInternalLogRequest = v.InferOutput<typeof BgInternalMessageSchema.log.request>;

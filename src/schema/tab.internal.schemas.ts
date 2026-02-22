import * as v from 'valibot';

export const TabInternalMessageSchema = {
    ping: {
        request: v.undefined(),
        response: v.undefined()
    },
    create_new_chat: {
        request: v.undefined(),
        response: v.undefined()
    },
    generate_text: {
        request: v.string(),
        response: v.string()
    }
};

export type TabInternalMessageMap = {
    [K in keyof typeof TabInternalMessageSchema]: {
        request: v.InferInput<(typeof TabInternalMessageSchema)[K]['request']>;
        response: v.InferInput<(typeof TabInternalMessageSchema)[K]['response']>;
    }
};

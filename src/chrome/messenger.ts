import * as v from 'valibot';
import { SimpleSchema, ValidatedSchema, MessageSender, SendResponse } from './types';
import { runtime } from './runtime';

interface MessagePayload<T> {
    type: keyof T;
    payload: unknown;
}

export function createExternalMessenger<T extends ValidatedSchema>(schemas: T) {
    return {
        send: async <K extends keyof T>(
            type: K,
            payload: v.InferInput<T[K]['request']>
        ): Promise<v.InferOutput<T[K]['response']> | { type: 'ValidationError' | 'SystemError' }> => {
            try {
                if (!runtime.id) return { type: 'SystemError' };

                const rawResponse = await runtime.sendMessage({
                    type: type as string,
                    payload
                });

                // Validation for response in external messenger
                const result = v.safeParse(schemas[type].response, rawResponse);

                if (!result.success) {
                    console.error('Response validation failed:', result.issues);
                    return { type: 'ValidationError' };
                }

                return result.output;

            } catch (_error) {
                return { type: 'SystemError' };
            }
        }
    };
}

export function createLocalMessenger<T extends SimpleSchema>() {
    return {
        send: async <K extends keyof T>(
            type: K,
            payload: T[K]['request']
        ): Promise<T[K]['response'] | { type: 'SystemError' }> => {
            try {
                if (!runtime.id) return { type: 'SystemError' };

                const rawResponse = await runtime.sendMessage({
                    type: type as string,
                    payload
                });

                // No validation for local
                return rawResponse as T[K]['response'];

            } catch (_error) {
                return { type: 'SystemError' };
            }
        }
    };
}


export function createLocalListener<T extends SimpleSchema>(
    // A mapping of types to handler functions
    handlers: {
        [K in keyof T]: (payload: T[K]['request']) => Promise<T[K]['response']> | T[K]['response']
    }
) {
    runtime.onMessage.addListener((message: unknown, _sender: MessageSender, sendResponse: SendResponse) => {
        if (typeof message !== 'object' || message === null || !('type' in message)) return false;

        const msg = message as MessagePayload<T>;
        const type = msg.type;
        const payload = msg.payload as T[keyof T]['request'];
        const handler = handlers[type];

        if (handler) {
            // Execute the handler and return the result
            Promise.resolve(handler(payload)).then(sendResponse);
            return true; // Keeps the message channel open for async response
        }
        return false;
    });
}


export function createExternalListener<T extends ValidatedSchema>(
    schemas: T,
    // A mapping of types to handler functions
    handlers: {
        [K in keyof T]: (payload: v.InferOutput<T[K]['request']>) => Promise<v.InferInput<T[K]['response']>> | v.InferInput<T[K]['response']>
    }
) {
    runtime.onMessageExternal.addListener((message: unknown, _sender: MessageSender, sendResponse: SendResponse) => {
        if (typeof message !== 'object' || message === null || !('type' in message)) return false;

        const msg = message as MessagePayload<T>;
        const type = msg.type;
        const payload = msg.payload;

        const schema = schemas[type];
        if (!schema) return false;

        const handler = handlers[type];

        if (handler) {
            // Validation for request in external listener
            const result = v.safeParse(schema.request, payload);

            if (!result.success) {
                console.error('Request validation failed:', result.issues);
                sendResponse({ type: 'ValidationError', issues: result.issues });
                return true;
            }

            // Execute the handler and return the result
            Promise.resolve(handler(result.output)).then(sendResponse);
            return true; // Keeps the message channel open for async response
        }
        return false;
    });
}
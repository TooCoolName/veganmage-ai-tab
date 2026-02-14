import * as v from 'valibot';
import { ExternalMessage, ExternalMessageKey, ExternalMessageKeys } from "./external.types";
import { GenerateTextSchema } from "./external.validators";
import { assertNever } from './types';

export function isExternalMessageKey(key: unknown): key is ExternalMessageKey {
    return typeof key === 'string' && (ExternalMessageKeys as readonly string[]).includes(key);
}

export function isExternalMessage(message: unknown): message is ExternalMessage {
    if (typeof message !== 'object' || message === undefined || !message || !('type' in message)) {
        return false;
    }

    const msg = message as Record<string, unknown>;

    if (!isExternalMessageKey(msg.type)) {
        return false;
    }

    switch (msg.type) {
        case 'ping':
            // Ping has no payload (undefined)
            return msg.payload === undefined;

        case 'generate_text':
            return v.is(GenerateTextSchema, msg.payload) as boolean;

        default: {
            assertNever(msg.type)
        }
    }
}
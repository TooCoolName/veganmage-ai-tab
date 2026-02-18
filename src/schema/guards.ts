import * as v from 'valibot';
import { ExternalMessage, ExternalMessageKey, ExternalMessageKeySet } from "./external.types";
import { GenerateTextSchema } from "./external.validators";
import { assertNever } from './types';

export function isExternalMessageKey(key: unknown): key is ExternalMessageKey {
    return typeof key === 'string' && ExternalMessageKeySet.has(key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    // eslint-disable-next-line no-restricted-syntax
    return typeof value === 'object' && value !== null;
}

export function isExternalMessage(message: unknown): message is ExternalMessage {
    if (!isRecord(message) || !('type' in message)) {
        return false;
    }

    if (!isExternalMessageKey(message.type)) {
        return false;
    }

    switch (message.type) {
        case 'ping':
            return message.payload === undefined;

        case 'generate_text':
            return v.is(GenerateTextSchema, message.payload);

        default:
            return assertNever(message.type);
    }
}

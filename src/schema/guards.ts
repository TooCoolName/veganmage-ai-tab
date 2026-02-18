import * as v from 'valibot';
import { ExternalMessage, ExternalMessageKey, ExternalMessageKeySet } from "./external.types";
import { GenerateTextSchema } from "./external.validators";
import { ProviderSettingsSchema, RegistrySchema, Registry, ProviderSetting } from "./settings.validators";
import { assertNever } from './types';

export function isExternalMessageKey(key: unknown): key is ExternalMessageKey {
    return typeof key === 'string' && ExternalMessageKeySet.has(key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
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

export function parseRegistry(data: unknown): Registry | undefined {
    const result = v.safeParse(RegistrySchema, data);
    return result.success ? result.output : undefined;
}

export function parseProviderSettings(data: unknown): ProviderSetting[] | undefined {
    const result = v.safeParse(ProviderSettingsSchema, data);
    return result.success ? result.output : undefined;
}

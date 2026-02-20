import * as v from 'valibot';
import { ExternalMessage, ExternalMessageKey, ExternalMessageKeySet } from "./external.types";
import { GenerateTextSchema } from "./external.validators";
import { ProviderSettingsSchema, RegistrySchema, Registry, ProviderSetting } from "./settings.validators";
import { assertNever } from './types';


export function parseRegistry(data: unknown): Registry | undefined {
    const result = v.safeParse(RegistrySchema, data);
    return result.success ? result.output : undefined;
}

export function parseProviderSettings(data: unknown): ProviderSetting[] | undefined {
    const result = v.safeParse(ProviderSettingsSchema, data);
    return result.success ? result.output : undefined;
}

import * as v from 'valibot';
import { ProviderSettingsSchema, RegistrySchema, type Registry, type ProviderSetting } from "./settings.schemas";


export function parseRegistry(data: unknown): Registry | undefined {
    const result = v.safeParse(RegistrySchema, data);
    return result.success ? result.output : undefined;
}

export function parseProviderSettings(data: unknown): ProviderSetting[] | undefined {
    const result = v.safeParse(ProviderSettingsSchema, data);
    return result.success ? result.output : undefined;
}

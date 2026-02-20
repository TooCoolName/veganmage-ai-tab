import * as v from 'valibot';
]import { ProviderSettingsSchema, RegistrySchema, Registry, ProviderSetting } from "./settings.validators";


export function parseRegistry(data: unknown): Registry | undefined {
    const result = v.safeParse(RegistrySchema, data);
    return result.success ? result.output : undefined;
}

export function parseProviderSettings(data: unknown): ProviderSetting[] | undefined {
    const result = v.safeParse(ProviderSettingsSchema, data);
    return result.success ? result.output : undefined;
}

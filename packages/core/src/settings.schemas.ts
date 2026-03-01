
import * as v from 'valibot';

export const ProviderSettingSchema = v.object({
    id: v.string(),
    enabled: v.boolean(),
    name: v.string(),
    url: v.string(),
    icon: v.optional(v.string()),
});

export type ProviderSetting = v.InferOutput<typeof ProviderSettingSchema>;

export const ProviderSettingsSchema = v.array(ProviderSettingSchema);


export const RegistrySchema = v.record(v.string(), v.array(v.number()));

export type Registry = v.InferOutput<typeof RegistrySchema>;

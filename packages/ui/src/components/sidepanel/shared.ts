import { createChromeStorage, createChromeMessage } from "@toocoolname/chrome-proxy";
import { TabInternalMessageSchema } from "@core/tab.internal.schemas";
import type { Provider } from "./types";

export function createSidepanelServices(mode: "real" | "mock" = "real") {
    const rawStorage = createChromeStorage(mode);
    const message = createChromeMessage(mode);
    const messenger = message.createTabMessenger(TabInternalMessageSchema);

    const storage = {
        async getProviders(): Promise<Provider[] | undefined> {
            return await rawStorage.local.get<Provider[]>("providerSettings");
        },
        async setProviders(providers: Provider[]): Promise<void> {
            await rawStorage.local.set("providerSettings", providers);
        }
    };

    return {
        storage,
        message,
        messenger,
    };
}

export type SidepanelServices = ReturnType<typeof createSidepanelServices>;

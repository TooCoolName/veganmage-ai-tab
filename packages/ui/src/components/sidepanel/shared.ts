import { createChromeStorage, createChromeMessage } from "@toocoolname/chrome-proxy";
import { TabInternalMessageSchema } from "@veganmage-ai-tab/core";

export function createSidepanelServices(mode: "real" | "mock" = "real") {
    const storage = createChromeStorage(mode);
    const message = createChromeMessage(mode);
    const messenger = message.createTabMessenger(TabInternalMessageSchema);

    return {
        storage,
        message,
        messenger,
    };
}

export type SidepanelServices = ReturnType<typeof createSidepanelServices>;

import { createChromeStorage, createChromeMessage } from "@toocoolname/chrome-proxy";
import { TabInternalMessageSchema } from "@veganmage-ai-tab/core";

export const chromeStorage = createChromeStorage("real");
export const chromeMessage = createChromeMessage("real");
export const tabMessenger = chromeMessage.createTabMessenger(TabInternalMessageSchema);

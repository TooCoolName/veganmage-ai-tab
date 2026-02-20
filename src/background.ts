import pino from 'pino';
import {
  ProviderSetting,
  Registry,
  parseRegistry,
  parseProviderSettings,
  GenerateText,
  InternalMessageMap,
  ExternalMessegeSchema
} from './schema';
import { chromeMessage, ChromeResult, chromeRuntime, chromeSidePanel, chromeStorage, chromeTabs, Tab, TabChangeInfo } from '@toocoolname/chrome-proxy';

const DEFAULT_PROVIDER_ORDER = ['chatgpt', 'gemini', 'copilot', 'deepseek', 'grok'];

const tabMessenger = chromeMessage.createTabMessenger<InternalMessageMap>();

const logger = pino({
  browser: {
    asObject: true
  },
  level: 'debug'
});

const DEFAULT_REGISTRY: Registry = {
  chatgpt: [],
  gemini: [],
  copilot: [],
  deepseek: [],
  grok: []
};

// Patterns for supported providers
const PROVIDER_PATTERNS: { [key: string]: RegExp } = {
  chatgpt: /^https:\/\/(chatgpt\.com|chat\.openai\.com)/,
  gemini: /^https:\/\/gemini\.google\.com/,
  copilot: /^https:\/\/(copilot\.microsoft\.com|bing\.com\/chat)/,
  deepseek: /^https:\/\/chat\.deepseek\.com/,
  grok: /^https:\/\/grok\.com/
};

// Track active requests to prevent using the same tab multiple times concurrently
const activeRequests = new Set<number>();
let tabSearchMutex: Promise<unknown> = Promise.resolve();

async function getRegistry(): Promise<Registry> {
  const result = await chromeStorage.session.get('tabRegistry');
  return parseRegistry(result.tabRegistry) ?? DEFAULT_REGISTRY;
}

async function saveRegistry(registry: Registry) {
  await chromeStorage.session.set({ tabRegistry: registry });
}


async function getProviderSettings(): Promise<ProviderSetting[] | undefined> {
  const result = await chromeStorage.local.get('providerSettings');
  return parseProviderSettings(result.providerSettings);
}

async function updateTabRegistry(tabId: number, url: string | undefined, remove: boolean = false) {
  const registry = await getRegistry();
  let changed = false;

  for (const [provider, pattern] of Object.entries(PROVIDER_PATTERNS)) {
    const isMatch = url && pattern.test(url);
    const index = registry[provider].indexOf(tabId);

    if (remove || !isMatch) {
      if (index !== -1) {
        registry[provider].splice(index, 1);
        changed = true;
      }
    } else if (isMatch) {
      if (index === -1) {
        registry[provider].push(tabId);
        changed = true;
      }
    }
  }

  if (changed) {
    await saveRegistry(registry);
    logger.info({ registry }, 'Registry updated');
  }
}

// Full sync to ensure state is accurate after a "sleep"
async function rebuildRegistry() {
  const registry: Registry = JSON.parse(JSON.stringify(DEFAULT_REGISTRY));
  const allTabs = await chromeTabs.query({});

  for (const tab of allTabs) {
    if (!tab.url || !tab.id) continue;
    for (const [provider, pattern] of Object.entries(PROVIDER_PATTERNS)) {
      if (pattern.test(tab.url)) {
        registry[provider].push(tab.id);
      }
    }
  }
  await saveRegistry(registry);
}

chromeRuntime.onInstalled.addListener(rebuildRegistry);
chromeRuntime.onStartup.addListener(rebuildRegistry);

chromeTabs.onUpdated.addListener((tabId: number, changeInfo: TabChangeInfo, tab: Tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updateTabRegistry(tabId, tab.url);
  }
});

chromeTabs.onRemoved.addListener((tabId: number) => {
  updateTabRegistry(tabId, undefined, true);
});

const externalHandlers = {
  ping: async (): Promise<ChromeResult<undefined>> => {
    return { success: true, data: undefined };
  },
  generate_text: async (payload: GenerateText): Promise<ChromeResult<string>> => {
    try {
      const result = await findAvailableProviderTab();
      if (!result) return { success: false, error: 'No active AI provider tabs found.' };

      const { selectedTabId } = result;
      try {
        const response = await executeProviderRequest(selectedTabId, payload.prompt);
        // Assuming the content script returns the text directly as response
        if (typeof response === 'string') {
          return { success: true, data: response };
        }
        return { success: false, error: 'Invalid response from content script' };
      } finally {
        activeRequests.delete(selectedTabId);
      }
    } catch (error) {
      console.error('Generate text error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
};

chromeMessage.createExternalListener(ExternalMessegeSchema, externalHandlers)

const internalHandlers = {
  log: async (request: InternalMessageMap['log']['request']): Promise<ChromeResult<InternalMessageMap['log']['response']>> => {
    const { level = 'info', msg, ...params } = request.payload ?? {};
    const source = 'internal';

    const payload = { ...params, source };
    switch (level) {
      case 'error': logger.error(payload, msg); break;
      case 'warn': logger.warn(payload, msg); break;
      case 'debug': logger.debug(payload, msg); break;
      default: logger.info(payload, msg); break;
    }

    return { success: true, data: undefined };
  }
};

chromeMessage.createLocalListener(InternalMessageMap, internalHandlers);

async function findAvailableProviderTab() {
  // Avoid mutex deadlock by ensuring catch returns void/undefined properly typed
  const next = tabSearchMutex.then(() => findAvailableProviderTabInternal());
  tabSearchMutex = next.catch(() => { });
  return next;
}

async function findAvailableProviderTabInternal() {
  const settings = await getProviderSettings();
  const registry = await getRegistry();
  let registryChanged = false;
  let selectedTabId: number | undefined = undefined;

  try {
    // Determine the order of providers to check
    const providerOrder = settings
      ? settings
        .filter((p: ProviderSetting) => p.enabled)
        .map((p: ProviderSetting) => p.id)
      : DEFAULT_PROVIDER_ORDER;

    for (const provider of providerOrder) {
      const tabIds = registry[provider] || [];
      const activeTabs: number[] = [];

      for (const tabId of tabIds) {
        if (selectedTabId) {
          activeTabs.push(tabId);
          continue;
        }

        // Skip if tab is currently busy processing another request
        if (activeRequests.has(tabId)) {
          activeTabs.push(tabId);
          continue;
        }

        try {
          const tab = await chromeTabs.get(tabId);

          // specific check: is it still the correct URL?
          const pattern = PROVIDER_PATTERNS[provider];
          if (!pattern?.test(tab.url ?? '')) {
            throw new Error("Tab URL no longer matches provider");
          }

          // Verify with ping
          const response = await tabMessenger.send(tabId, 'ping', undefined);
          if (response.success) {
            selectedTabId = tabId;
            // Mark as active immediately to prevent other concurrent searches picking it
            activeRequests.add(tabId);
            activeTabs.push(tabId);
          } else {
            throw new Error("Tab ping failed");
          }

        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          logger.warn({ tabId, provider, error: errorMessage }, 'Tab is not available');
          registryChanged = true;
          // Do not add to activeTabs, effectively removing it
        }
      }

      // Update the registry for this provider if we found dead tabs
      if (activeTabs.length !== tabIds.length) {
        registry[provider] = activeTabs;
        registryChanged = true;
      }

      if (selectedTabId) break;
    }

    if (registryChanged) {
      await saveRegistry(registry);
    }

    if (!selectedTabId) return undefined;

    return { selectedTabId };
  } catch {
    if (selectedTabId !== undefined) {
      activeRequests.delete(selectedTabId);
    }
    return undefined;
  }
}

async function executeProviderRequest(tabId: number, prompt: string) {
  // Execute
  // Note: 'create_new_chat' might also fail if the tab *just* died, but we just checked it.
  const createResponse = await tabMessenger.send(tabId, 'create_new_chat', undefined);
  if (!createResponse.success) {
    throw new Error(createResponse.error ?? 'Call to create_new_chat failed');
  }

  const response = await tabMessenger.send(tabId, 'generate_text', prompt);

  if (!response.success) {
    throw new Error(response.error ?? 'Call to generate_text failed');
  }

  return response.data;
}

logger.info("Vegan Mage extension loaded");

chromeSidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: unknown) => console.error(error));

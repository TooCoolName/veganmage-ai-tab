import pino from 'pino';
import { ExternalMessage, ExternalMessageKey, ExternalMessageRequest, ExternalMessageResponse, isExternalMessage } from './schema';
import { assertNever } from './schema/types';

// T071: Tab Registry - We use a helper instead of a global object
const DEFAULT_PROVIDER_ORDER = ['chatgpt', 'gemini', 'copilot', 'deepseek', 'grok'];

const logger = pino({
  browser: {
    asObject: true
  },
  level: 'debug'
});

interface Registry {
  [key: string]: number[];
}

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

// --- Storage Helpers ---

async function getRegistry(): Promise<Registry> {
  const result = await chrome.storage.session.get('tabRegistry');
  if (result.tabRegistry && typeof result.tabRegistry === 'object') {
    return result.tabRegistry as Registry;
  }
  return JSON.parse(JSON.stringify(DEFAULT_REGISTRY)) as Registry;
}

async function saveRegistry(registry: Registry) {
  await chrome.storage.session.set({ tabRegistry: registry });
}

interface ProviderSetting {
  id: string;
  enabled: boolean;
  name: string;
  url: string;
  icon?: string;
}

async function getProviderSettings(): Promise<ProviderSetting[] | undefined> {
  const result = await chrome.storage.local.get('providerSettings');
  if (Array.isArray(result.providerSettings)) {
    // Assuming the structure is correct if it's an array for now, or use a proper validator if strictly needed
    return result.providerSettings as ProviderSetting[];
  }
  return undefined;
}

// --- Registry Logic ---

async function updateTabRegistry(tabId: number, url: string | undefined, remove = false) {
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
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (!tab.url || !tab.id) continue;
    for (const [provider, pattern] of Object.entries(PROVIDER_PATTERNS)) {
      if (pattern.test(tab.url)) {
        registry[provider].push(tab.id);
      }
    }
  }
  await saveRegistry(registry);
}

// --- Event Listeners ---

chrome.runtime.onInstalled.addListener(rebuildRegistry);
chrome.runtime.onStartup.addListener(rebuildRegistry);

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updateTabRegistry(tabId, tab.url);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  updateTabRegistry(tabId, undefined, true);
});



type Handler<K extends ExternalMessageKey> = (
  payload: ExternalMessageRequest<K>,
  sender: chrome.runtime.MessageSender
) => Promise<ExternalMessageResponse<K>>;

const handlePing: Handler<'ping'> = async () => ({
  success: true,
  data: undefined
});

const handleGenerateText: Handler<'generate_text'> = async (payload) => {
  try {
    const result = await findAvailableProviderTab();
    if (!result) throw new Error('No active AI provider tabs found.');

    const { selectedTabId } = result;
    try {
      const response = await executeProviderRequest(selectedTabId, payload.prompt);
      // Assuming the content script returns the text directly as response
      if (typeof response === 'string') {
        return { success: true, data: response };
      }
      throw new Error('Invalid response from content script');
    } finally {
      activeRequests.delete(selectedTabId);
    }
  } catch (error) {
    console.error('Generate text error:', error);
    throw error; // Let the main handler catch and format the error
  }
};

chrome.runtime.onMessageExternal.addListener((message: unknown, sender, sendResponse) => {
  // 1. Initial Type Guard
  if (!isExternalMessage(message)) return false;

  // 2. Encapsulate execution logic
  handleExternalMessage(message, sender)
    .then(sendResponse)
    .catch(err => sendResponse({
      success: false,
      error: err instanceof Error ? err.message : 'Internal Error'
    }));

  return true; // Keep channel open
});

async function handleExternalMessage(
  message: ExternalMessage, // Discriminated union
  sender: chrome.runtime.MessageSender
) {
  switch (message.type) {
    case 'ping':
      return handlePing(message.payload, sender);

    case 'generate_text': {
      return handleGenerateText(message.payload, sender);
    }
    default: {
      assertNever(message)
    }
  }
}

// Internal message listener for features like logging
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'log') {
    const { level = 'info', msg, ...params } = message.payload ?? {};
    const source = sender.tab ? `tab:${sender.tab.id}` : 'internal';

    const payload = { ...params, source };
    switch (level) {
      case 'error': logger.error(payload, msg); break;
      case 'warn': logger.warn(payload, msg); break;
      case 'debug': logger.debug(payload, msg); break;
      default: logger.info(payload, msg); break;
    }

    sendResponse({ success: true });
    return true; // Keep channel open
  }

  // Handle other internal messages if necessary
  if (message.action === 'provider_settings_updated') {
    logger.info('Provider settings updated from sidepanel');
    sendResponse({ success: true });
    return false;
  }

  return false;
});

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
      ? settings.filter(p => p.enabled).map(p => p.id)
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
          const tab = await chrome.tabs.get(tabId);

          // specific check: is it still the correct URL?
          const pattern = PROVIDER_PATTERNS[provider];
          if (!pattern?.test(tab.url ?? '')) {
            throw new Error("Tab URL no longer matches provider");
          }

          // Verify with ping
          const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
          if (response?.alive) {
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
    return undefined; // Explicitly return null on failure
  }
}

async function executeProviderRequest(tabId: number, prompt: string) {
  // Execute
  // Note: 'create_new_chat' might also fail if the tab *just* died, but we just checked it.
  const createResponse = await chrome.tabs.sendMessage(tabId, { action: 'create_new_chat' });
  if (createResponse?.success === false) {
    throw new Error(createResponse.error ?? 'Failed to create new chat');
  }

  const response = await chrome.tabs.sendMessage(tabId, {
    action: 'generate_text',
    prompt
  });

  if (typeof response !== 'string') {
    throw new Error('Unexpected response type from generate_text');
  }
  return response;
}

logger.info("Vegan Mage extension loaded");

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

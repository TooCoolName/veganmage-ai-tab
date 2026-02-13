// T071: Tab Registry - We use a helper instead of a global object
const DEFAULT_PROVIDER_ORDER = ['chatgpt', 'gemini', 'copilot', 'deepseek', 'grok'];

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
  return result.tabRegistry ?? JSON.parse(JSON.stringify(DEFAULT_REGISTRY));
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
  return result.providerSettings ?? undefined;
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
    console.log('Registry updated:', registry);
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

// --- Message Handling ---

interface ExternalMessage {
  action?: string;
  type?: string;
  prompt?: string;
  [key: string]: unknown;
}

chrome.runtime.onMessageExternal.addListener((message: ExternalMessage, sender, sendResponse) => {
  const action = message.action ?? message.type;

  handleExternalMessage({ ...message, action })
    .then(sendResponse)
    .catch(error => sendResponse({ success: false, error: error.message }));

  return true;
});

async function handleExternalMessage(message: ExternalMessage) {
  if (message.action === 'ping') return { success: true, data: undefined };

  if (message.action === 'generate_text') {
    const { prompt } = message;
    if (!prompt) throw new Error('Missing prompt');

    const result = await findAvailableProviderTab();
    if (!result) throw new Error('No active AI provider tabs found.');

    const { selectedTabId } = result;
    try {
      const response = await executeProviderRequest(selectedTabId, prompt);
      return { success: true, data: response };
    } finally {
      activeRequests.delete(selectedTabId);
    }
  }

  throw new Error(`Unknown action: ${message.action}`);
}

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
          console.log(`Tab ${tabId} for ${provider} is not available: ${(e as Error).message}`);
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
    if (selectedTabId) {
      activeRequests.delete(selectedTabId as number);
    }
    return undefined; // Explicitly return null on failure
  }
}

async function executeProviderRequest(tabId: number, prompt: string) {
  // Execute
  // Note: 'create_new_chat' might also fail if the tab *just* died, but we just checked it.
  const createResponse = await chrome.tabs.sendMessage(tabId, { action: 'create_new_chat' });
  if (createResponse?.success === false) {
    return createResponse;
  }

  const response = await chrome.tabs.sendMessage(tabId, {
    action: 'generate_text',
    prompt
  });
  return response;
}

console.log("Vegan Mage extension loaded");

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

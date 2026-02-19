export const storage = {
    local: {
        get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>> {
            return chrome.storage.local.get(keys);
        },
        set(items: Record<string, unknown>): Promise<void> {
            return chrome.storage.local.set(items);
        },
        remove(keys: string | string[]): Promise<void> {
            return chrome.storage.local.remove(keys);
        },
        clear(): Promise<void> {
            return chrome.storage.local.clear();
        }
    },
    session: {
        get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>> {
            return chrome.storage.session.get(keys);
        },
        set(items: Record<string, unknown>): Promise<void> {
            return chrome.storage.session.set(items);
        },
        remove(keys: string | string[]): Promise<void> {
            return chrome.storage.session.remove(keys);
        },
        clear(): Promise<void> {
            return chrome.storage.session.clear();
        }
    },
    sync: {
        get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>> {
            return chrome.storage.sync.get(keys);
        },
        set(items: Record<string, unknown>): Promise<void> {
            return chrome.storage.sync.set(items);
        },
        remove(keys: string | string[]): Promise<void> {
            return chrome.storage.sync.remove(keys);
        },
        clear(): Promise<void> {
            return chrome.storage.sync.clear();
        }
    }
};

import { Tab, QueryInfo, TabChangeInfo } from './types';

export const tabs = {
    query(queryInfo: QueryInfo): Promise<Tab[]> {
        return chrome.tabs.query(queryInfo);
    },

    get(tabId: number): Promise<Tab> {
        return chrome.tabs.get(tabId);
    },

    sendMessage<T = unknown, R = unknown>(tabId: number, message: T): Promise<R> {
        return chrome.tabs.sendMessage(tabId, message);
    },

    onUpdated: {
        addListener(callback: (tabId: number, changeInfo: TabChangeInfo, tab: Tab) => void): void {
            chrome.tabs.onUpdated.addListener(callback);
        },
        removeListener(callback: (tabId: number, changeInfo: TabChangeInfo, tab: Tab) => void): void {
            chrome.tabs.onUpdated.removeListener(callback);
        }
    },

    onRemoved: {
        addListener(callback: (tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => void): void {
            chrome.tabs.onRemoved.addListener(callback);
        },
        removeListener(callback: (tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => void): void {
            chrome.tabs.onRemoved.removeListener(callback);
        }
    }
};

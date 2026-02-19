import { MessageListener, InstalledDetails } from './types';

export const runtime = {
    get id(): string {
        return chrome.runtime.id;
    },

    getURL(path: string): string {
        return chrome.runtime.getURL(path);
    },

    sendMessage<T = unknown, R = unknown>(message: T): Promise<R> {
        return chrome.runtime.sendMessage(message);
    },

    onMessage: {
        addListener<T = unknown>(callback: MessageListener<T>): void {
            chrome.runtime.onMessage.addListener(callback as Parameters<typeof chrome.runtime.onMessage.addListener>[0]);
        },
        removeListener<T = unknown>(callback: MessageListener<T>): void {
            chrome.runtime.onMessage.removeListener(callback as Parameters<typeof chrome.runtime.onMessage.removeListener>[0]);
        }
    },

    onMessageExternal: {
        addListener<T = unknown>(callback: MessageListener<T>): void {
            chrome.runtime.onMessageExternal.addListener(callback as Parameters<typeof chrome.runtime.onMessageExternal.addListener>[0]);
        },
        removeListener<T = unknown>(callback: MessageListener<T>): void {
            chrome.runtime.onMessageExternal.removeListener(callback as Parameters<typeof chrome.runtime.onMessageExternal.removeListener>[0]);
        }
    },

    onInstalled: {
        addListener(callback: (details: InstalledDetails) => void): void {
            chrome.runtime.onInstalled.addListener(callback);
        }
    },

    onStartup: {
        addListener(callback: () => void): void {
            chrome.runtime.onStartup.addListener(callback);
        }
    }
};

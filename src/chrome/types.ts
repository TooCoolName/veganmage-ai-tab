export type MessageSender = chrome.runtime.MessageSender;
export type Port = chrome.runtime.Port;

export type SendResponse = (response?: unknown) => void;

export type InstalledDetails = chrome.runtime.InstalledDetails;

export type MessageListener<T = unknown> = (
    message: T,
    sender: MessageSender,
    sendResponse: SendResponse
) => boolean | void | Promise<void>;

export type Tab = chrome.tabs.Tab;
export type QueryInfo = chrome.tabs.QueryInfo;
export type TabChangeInfo = chrome.tabs.TabChangeInfo;

export type StorageArea = chrome.storage.StorageArea;

export type PanelBehavior = chrome.sidePanel.PanelBehavior;
export type PanelOptions = chrome.sidePanel.PanelOptions;
export type GetPanelOptions = chrome.sidePanel.GetPanelOptions;
export type OpenOptions = unknown; // Might be missing in older @types/chrome

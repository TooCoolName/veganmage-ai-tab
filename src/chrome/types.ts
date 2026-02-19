export type MessageSender = chrome.runtime.MessageSender;
export type Port = chrome.runtime.Port;

export type SendResponse = (response?: unknown) => void;

export type InstalledDetails = chrome.runtime.InstalledDetails;

export type MessageListener<T = unknown> = (
    message: T,
    sender: MessageSender,
    sendResponse: SendResponse
) => boolean | void | Promise<void>;

import { ChromeResult } from "@toocoolname/chrome-proxy";
import { GenerateText } from "./external.validators";

export type ExternalMessageBus = {
    ping: {
        request: undefined;
        response: ChromeResult<undefined>;
    };
    generate_text: {
        request: GenerateText;
        response: ChromeResult<string>;
    };
};

export type ExternalMessage = {
    [K in ExternalMessageKey]: {
        type: K;
        payload: ExternalMessageBus[K]['request'];
    };
}[ExternalMessageKey];

export type ExternalMessageRequest<K extends ExternalMessageKey = ExternalMessageKey> = ExternalMessageBus[K]['request'];
export type ExternalMessageResponse<K extends ExternalMessageKey> = ExternalMessageBus[K]['response'];

export const externalMessageKeys = ['ping', 'generate_text'] as const;
export type ExternalMessageKey = typeof externalMessageKeys[number];

export const ExternalMessageKeySet = new Set<string>(externalMessageKeys);

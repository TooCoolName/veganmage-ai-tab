export type AiPromptGenerateRequest = {
    prompt: string;
}

export type ExternalExtensionResponse<T> =
    | { success: true, data: T }
    | { success: false; error: string };

export type AiPromptBus = {
    ping: {
        request: undefined;
        response: ExternalExtensionResponse<unknown>;
    };
    generate_text: {
        request: AiPromptGenerateRequest;
        response: ExternalExtensionResponse<string>;
    };
};

export type AiPromptMessageKey = keyof AiPromptBus;
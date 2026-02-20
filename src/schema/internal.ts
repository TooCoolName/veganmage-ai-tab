
export type InternalMessageMap = {
    ping: {
        request: { action: 'ping' };
        response: { alive: true };
    };
    create_new_chat: {
        request: { action: 'create_new_chat' };
        response: { success: boolean; error?: string };
    };
    generate_text: {
        request: { action: 'generate_text'; prompt: string };
        response: { success: boolean; response?: string; error?: string };
    };
    log: {
        request: {
            action: 'log';
            payload: { level?: string; msg: string;[key: string]: unknown }
        };
        response: { success: boolean };
    };
};

export type InternalRequest = InternalMessageMap[keyof InternalMessageMap]['request'];
export type InternalResponse = InternalMessageMap[keyof InternalMessageMap]['response'];

export function isInternalRequest(message: unknown): message is InternalRequest {
    return typeof message === 'object' && !!message && 'action' in message;
}


export type InternalMessageMap = {
    ping: {
        request: undefined;
        response: undefined;
    };
    create_new_chat: {
        request: undefined;
        response: undefined;
    };
    generate_text: {
        request: string;
        response: string;
    };
    log: {
        request: {
            action: 'log';
            payload: { level?: string; msg: string;[key: string]: unknown }
        };
        response: undefined;
    };
};

export type InternalRequest = InternalMessageMap[keyof InternalMessageMap]['request'];
export type InternalResponse = InternalMessageMap[keyof InternalMessageMap]['response'];

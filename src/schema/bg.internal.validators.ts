
export type BgInternalMessageMap = {
    log: {
        request: {
            action: 'log';
            payload: { level?: string; msg: string;[key: string]: unknown }
        };
        response: undefined;
    };
};

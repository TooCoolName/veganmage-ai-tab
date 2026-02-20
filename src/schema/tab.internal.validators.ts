
export type TabInternalMessageMap = {
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
};

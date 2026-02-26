import { TabInternalMessageSchema } from "@/schema";
import { chromeMessage, type ChromeResult } from '@toocoolname/chrome-proxy';
import { getMessageText, waitForResponse as genericWaitForResponse, pressEnter, findSendButton as genericFindSendButton, handleGenerateText, pressShortcut } from './utils';
import { isNotNull } from "@/null.utils";

// Function to find the send button
function findSendButton() {
    return genericFindSendButton([
        '[data-testid="send-button"]'
    ]);
}

// Function to trigger Ctrl+Shift+O to create a new chat using ChatGPT's built-in shortcut
function createNewChat() {
    // Dispatch Ctrl+Shift+O keyboard event to trigger ChatGPT's native new chat
    pressShortcut({
        key: 'O',
        code: 'KeyO',
        keyCode: 79,
        ctrlKey: true,
        shiftKey: true
    });

    console.log('Triggered Ctrl+Shift+O for new chat');
    return true;
}

// Listen for messages from background script
chromeMessage.createLocalListener(TabInternalMessageSchema, {
    ping: async (): Promise<ChromeResult<undefined>> => {
        return { success: true, data: undefined };
    },
    create_new_chat: async (): Promise<ChromeResult<undefined>> => {
        createNewChat();
        return { success: true, data: undefined };
    },
    generate_text: async (prompt: string): Promise<ChromeResult<string>> => {
        const getMessages = () => document.querySelectorAll('[data-message-author-role="assistant"]');
        try {
            const response = await handleGenerateText(prompt, {
                inputSelector: '#prompt-textarea',
                findSendButton,
                pressEnter: () => pressEnter('#prompt-textarea', true),
                waitForResponse: (initialCount: number) => waitForResponse(initialCount),
                getMessages
            });
            return { success: true, data: response };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: errorMessage };
        }
    }
});

// Helper to wait for response completion
function waitForResponse(initialCount?: number) {
    return genericWaitForResponse({
        getMessages: () => document.querySelectorAll('[data-message-author-role="assistant"]'),
        isGenerating: (el: Element) => isNotNull(el.querySelector('[data-testid="stop-button"]')),
        extractText: getMessageText,
        initialCount,
        isGeneratingCheckArea: () => document.querySelector("#thread-bottom") ?? undefined
    });
}

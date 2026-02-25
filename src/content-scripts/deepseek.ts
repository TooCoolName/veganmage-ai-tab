import { TabInternalMessageSchema } from "@/schema";
import { chromeMessage, ChromeResult } from '@toocoolname/chrome-proxy';
import { getMessageText, waitForResponse as genericWaitForResponse, pressEnter, handleGenerateText, pressShortcut, injectReceiver } from './utils';

// DeepSeek Content Script
// Handles prompt injection, sending, and response extraction

// Prevent DeepSeek from pausing renders when in background tab
injectReceiver();

// Function to find the send button - disabled as requested because buttons cannot be detected reliably
function findSendButton() {
    return undefined;
}

// Function to create a new chat - only triggers Ctrl+J keyboard shortcut
function createNewChat() {
    pressShortcut({
        key: 'j',
        code: 'KeyJ',
        keyCode: 74,
        ctrlKey: true
    });

    console.log('Triggered Ctrl+J for new chat');

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
        const textareaSelector = '.ds-scroll-area__gutters textarea, textarea';
        const getMessages = () => document.querySelectorAll('.ds-message');
        try {
            const response = await handleGenerateText(prompt, {
                inputSelector: textareaSelector,
                findSendButton,
                pressEnter: () => pressEnter(textareaSelector, false),
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
        getMessages: () => document.querySelectorAll('.ds-message'),
        isGenerating: (el: Element) => {
            // Check if any element with role="button" exists within the message container
            return !el.parentElement?.querySelector('[role="button"]');
        },
        extractText: getMessageText,
        initialCount
    });
}

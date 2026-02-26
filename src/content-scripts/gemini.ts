import { TabInternalMessageSchema } from "@/schema";
import { chromeMessage, type ChromeResult } from '@toocoolname/chrome-proxy';
import { getMessageText, waitForResponse as genericWaitForResponse, pressEnter, handleGenerateText, pressShortcut, logger } from './utils';
import { isNotNull } from "@/null.utils";

// Gemini Content Script
// Handles prompt injection, sending, and response extraction

// Function to find the send button
function findSendButton() {
    // Selectors from enter-behavior-gemini.js
    const selectors = [
        'button[aria-label*="Send"]',
        'button[aria-label*="send"]',
        'button.send-button',
        'button mat-icon[fonticon="send"]',
        'button.submit'
    ];

    for (const selector of selectors) {
        const match = document.querySelector<HTMLButtonElement>(selector);
        if (match && !match.disabled && match.offsetParent) { // visible check
            // Sometimes multiple buttons exist (e.g. update vs send), we prefer the main send
            if (match.innerText === 'Update') continue;
            return match;
        }
    }

    return undefined;
}

// Function to trigger Ctrl+Shift+O to create a new chat using Gemini's built-in shortcut
function createNewChat() {
    // Dispatch Ctrl+Shift+O keyboard event to trigger Gemini's native new chat
    pressShortcut({
        key: 'O',
        code: 'KeyO',
        keyCode: 79,
        ctrlKey: true,
        shiftKey: true
    });

    logger.info('Triggered native new chat shortcut');
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
        const getMessages = () => document.querySelectorAll('.response-container');
        try {
            const response = await handleGenerateText(prompt, {
                inputSelector: '.ql-editor',
                findSendButton,
                pressEnter: () => pressEnter('.ql-editor', true),
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
        getMessages: () => document.querySelectorAll<HTMLElement>('.response-container'),
        isGenerating: (el: Element) => isNotNull(el.querySelector('[data-mat-icon-name="stop"]')),
        extractText: (el: HTMLElement) => getMessageText(el.querySelector<HTMLElement>('.model-response-text') ?? undefined),
        initialCount,
        isGeneratingCheckArea: () => document.querySelector("input-container") ?? undefined
    });
}

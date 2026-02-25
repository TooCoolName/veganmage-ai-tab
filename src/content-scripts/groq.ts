import { TabInternalMessageSchema } from "@/schema";
import { chromeMessage, ChromeResult } from '@toocoolname/chrome-proxy';
import { waitForResponse as genericWaitForResponse, pressEnter, handleGenerateText, injectReceiver } from './utils';

// Groq Content Script
// Handles prompt injection, sending, and response extraction

// Prevent Groq from pausing renders when in background tab
injectReceiver();

// Function to find the send button
function findSendButton() {
    // Priority 1: button[type="submit"]
    const btn = document.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (btn && !btn.disabled) return btn;

    // Priority 2: Aria label "Submit" or "Send" (generic)
    const candidates = document.querySelectorAll('button');
    for (const c of candidates) {
        const aria = (c.getAttribute('aria-label') ?? '').toLowerCase();
        if (aria.includes('submit') || aria.includes('send') || c.innerText.trim() === 'Submit') {
            if (!c.disabled) return c;
        }
    }

    return undefined;
}

// Function to create a new chat - assuming standard shortcuts or button
function createNewChat() {
    const buttons = document.querySelectorAll<HTMLElement>('main .grow button');
    if (buttons.length > 0) {
        buttons[0].click();
        console.log('Clicked New Chat button');
        return true;
    }

    console.log('New Chat button not found');
    return false;
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
        // Groq usually has messages in divs. We need to find the container. 
        // This selector is a guess and should be refined.
        const getMessages = () => document.querySelectorAll('main .grow > .flex');

        try {
            const response = await handleGenerateText(prompt, {
                inputSelector: '#chat',
                findSendButton,
                pressEnter: () => pressEnter('#chat', true),
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
        getMessages: () => document.querySelectorAll('main .grow > .flex'),
        isGenerating: (el: Element) => {
            return !el.querySelector('button');
        },
        extractText: (el: HTMLElement) => {
            const content = el.children[1];
            if (content && content instanceof HTMLElement) {
                return content ? content.innerText : '';
            } else {
                return ""
            }
        },
        initialCount,
    });
}

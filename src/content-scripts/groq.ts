import { getMessageText, waitForResponse as genericWaitForResponse, injectText, pressEnter, handleGenerateText } from './utils';

// Groq Content Script
// Handles prompt injection, sending, and response extraction

// Function to find the send button
function findSendButton() {
    // Priority 1: button[type="submit"]
    const btn = document.querySelector('button[type="submit"]') as HTMLElement;
    if (btn && !(btn as HTMLButtonElement).disabled) return btn;

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
    const buttons = document.querySelectorAll('main .grow button');
    if (buttons.length > 0) {
        (buttons[0] as HTMLElement).click();
        console.log('Clicked New Chat button');
        return true;
    }

    console.log('New Chat button not found');
    return false;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Health check ping
    if (request.action === 'ping') {
        sendResponse({ alive: true });
        return;
    }

    if (request.action === 'create_new_chat') {
        const success = createNewChat();
        sendResponse({ success: success });
        return;
    }

    if (request.action === 'generate_text') {
        // Groq usually has messages in divs. We need to find the container. 
        // This selector is a guess and should be refined.
        const getMessages = () => document.querySelectorAll('main.grow > .flex');

        return handleGenerateText(request.prompt, sendResponse, {
            injectText: (prompt: string) => injectText('#chat', prompt),
            findSendButton,
            pressEnter: () => pressEnter('#chat', true),
            waitForResponse: (initialCount: number) => waitForResponse(initialCount),
            getMessages
        });
    }
});

// Helper to wait for response completion
function waitForResponse(initialCount?: number) {
    return genericWaitForResponse({
        getMessages: () => document.querySelectorAll('main.grow > .flex'),
        // Check if generating by looking for a Stop button
        isGenerating: (_el: Element) => {
            const stopBtn = document.querySelector('button[aria-label="Stop generating"], button[aria-label="Stop"]');
            return !!stopBtn;
        },
        extractText: getMessageText,
        initialCount
    });
}

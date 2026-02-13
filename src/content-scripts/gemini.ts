import { getMessageText, waitForResponse as genericWaitForResponse, injectText, pressEnter, handleGenerateText, pressShortcut, logger } from './utils';

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
        const match = document.querySelector(selector) as HTMLElement;
        if (match && !(match as HTMLButtonElement).disabled && match.offsetParent) { // visible check
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
        const getMessages = () => document.querySelectorAll('.response-container');
        return handleGenerateText(request.prompt, sendResponse, {
            injectText: (prompt: string) => injectText('.ql-editor', prompt),
            findSendButton,
            pressEnter,
            waitForResponse: (initialCount: number) => waitForResponse(initialCount),
            getMessages
        });
    }
});

// Helper to wait for response completion
function waitForResponse(initialCount?: number) {
    return genericWaitForResponse({
        getMessages: () => document.querySelectorAll('.response-container'),
        isGenerating: (el: Element) => !el.querySelector('button'),
        extractText: (el) => getMessageText(el.querySelector('.model-response-text') ?? undefined),
        initialCount
    });
}

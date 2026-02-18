import { getMessageText, waitForResponse as genericWaitForResponse, injectText, pressEnter, handleGenerateText, pressShortcut } from './utils';

// Grok Content Script
// Handles prompt injection, sending, and response extraction

// Function to find the send button
function findSendButton() {
    // Priority 1: button[type="submit"]
    const btn = document.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (btn && !btn.disabled) return btn;

    // Priority 2: Aria label "Submit" or "Send" (generic)
    const candidates = document.querySelectorAll('button');
    for (const c of candidates) {
        const aria = c.getAttribute('aria-label') ?? '';
        if (aria.includes('Submit') || aria.includes('Send') || c.innerText.trim() === 'Submit') {
            if (!c.disabled) return c;
        }
    }

    return undefined;
}

// Function to trigger Ctrl+J to create a new chat using Grok's built-in shortcut
function createNewChat() {
    // Dispatch Ctrl+J keyboard event to trigger Grok's native new chat
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
        const getMessages = () => document.querySelectorAll('.message-bubble');
        return handleGenerateText(request.prompt, sendResponse, {
            injectText: (prompt: string) => injectText('textarea, [role="textbox"]', prompt),
            findSendButton,
            pressEnter: () => pressEnter('textarea, [role="textbox"]', true),
            waitForResponse: (initialCount: number) => waitForResponse(initialCount),
            getMessages
        });
    }
});

// Helper to wait for response completion
function waitForResponse(initialCount?: number) {
    return genericWaitForResponse({
        getMessages: () => document.querySelectorAll('.message-bubble'),
        isGenerating: (el: Element) => !el.parentElement?.querySelector('button'),
        extractText: getMessageText,
        initialCount
    });
}

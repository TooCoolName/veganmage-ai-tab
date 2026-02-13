import { getMessageText, waitForResponse as genericWaitForResponse, injectText, pressEnter, handleGenerateText, pressShortcut } from './utils';

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
    // Try to find a "New Chat" button first
    const buttons = document.querySelectorAll('button, a');
    for (const btn of buttons) {
        if ((btn.textContent?.includes('New Chat') || btn.getAttribute('aria-label')?.includes('New Chat'))) {
            (btn as HTMLElement).click();
            console.log('Clicked New Chat button');
            return true;
        }
    }

    // Fallback to URL navigation if supported/needed, or keyboard shortcut if known. 
    // For now, let's try a common shortcut or just log not found.
    console.log('New Chat button not found, attempting generic shortcut');
    // Many apps use Ctrl+J or Ctrl+O. Let's try Ctrl+O as a fallback similar to others
    pressShortcut({
        key: 'o',
        code: 'KeyO',
        keyCode: 79,
        ctrlKey: true,
        metaKey: true // Cmd+O on mac often
    });

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
        const getMessages = () => document.querySelectorAll('.message, [data-testid="message"], .prose');

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
        getMessages: () => document.querySelectorAll('.message, [data-testid="message"], .prose'),
        // Check if generating by looking for a Stop button
        isGenerating: (el: Element) => {
            const stopBtn = document.querySelector('button[aria-label="Stop generating"], button[aria-label="Stop"]');
            return !!stopBtn;
        },
        extractText: getMessageText,
        initialCount
    });
}

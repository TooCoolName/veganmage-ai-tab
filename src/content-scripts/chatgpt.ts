import { getMessageText, waitForResponse as genericWaitForResponse, injectText, pressEnter, findSendButton as genericFindSendButton, handleGenerateText, pressShortcut } from './utils';

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
        const getMessages = () => document.querySelectorAll('[data-message-author-role="assistant"]');
        return handleGenerateText(request.prompt, sendResponse, {
            injectText: (prompt: string) => injectText('#prompt-textarea', prompt),
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
        getMessages: () => document.querySelectorAll('[data-message-author-role="assistant"]'),
        isGenerating: (el: Element) => !(el.closest('article, [role="article"]')?.querySelector('button')),
        extractText: getMessageText,
        initialCount
    });
}

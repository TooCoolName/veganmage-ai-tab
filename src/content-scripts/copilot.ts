import { getMessageText, waitForResponse as genericWaitForResponse, injectText, pressEnter, findSendButton as genericFindSendButton, handleGenerateText } from './utils';

// Copilot Content Script
// Handles prompt injection, sending, and response extraction

// Function to find the send button
function findSendButton() {
    return genericFindSendButton([
        'button[data-testid="submit-button"]',
        'button[aria-label="Submit message"]',
        'button[aria-label*="Submit"]',
        'button[title*="Submit"]'
    ]);
}

// Function to create a new chat by clicking the "Start new chat" button
function createNewChat() {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.pointer-events-none button');
    const newChatButton = buttons[2];
    if (!newChatButton) {
        return undefined
    }
    if (newChatButton) {
        newChatButton.click();
        console.log('New chat created via button click');
        return true;
    } else {
        console.error('Start new chat button not found');
        return false;
    }
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
        const getMessages = () => document.querySelectorAll('.group\\/ai-message');
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
        getMessages: () => document.querySelectorAll('.group\\/ai-message'),
        isGenerating: (el: Element) => {
            return !el.querySelector('button');
        },
        extractText: (el: Element) => {
            // Check if this is a group/ai-message container
            const items = el.querySelectorAll('.group\\/ai-message-item');
            if (items.length > 0) {
                return Array.from(items)
                    .map(item => getMessageText(item))
                    .join('\n\n');
            }
            return getMessageText(el);
        },
        initialCount
    });
}

import { InternalRequest } from "@/schema";
import { getMessageText, waitForResponse as genericWaitForResponse, injectText, pressEnter, findSendButton as genericFindSendButton, handleGenerateText, pressShortcut } from './utils';
import { runtime, MessageSender, SendResponse } from '@/chrome';

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
runtime.onMessage.addListener((request: InternalRequest, sender: MessageSender, sendResponse: SendResponse) => {
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
            pressEnter: () => pressEnter('#prompt-textarea', true),
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

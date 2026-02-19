import { InternalRequest } from "@/schema";
import { getMessageText, waitForResponse as genericWaitForResponse, injectText, pressEnter, handleGenerateText, pressShortcut } from './utils';
import { runtime, MessageSender, SendResponse } from '@/chrome';

// DeepSeek Content Script
// Handles prompt injection, sending, and response extraction

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
        const textareaSelector = '.ds-scroll-area__gutters textarea, textarea';
        const getMessages = () => document.querySelectorAll('.ds-message');
        return handleGenerateText(request.prompt, sendResponse, {
            injectText: (prompt: string) => injectText(textareaSelector, prompt),
            findSendButton,
            pressEnter: () => pressEnter(textareaSelector, false),
            waitForResponse: (initialCount: number) => waitForResponse(initialCount),
            getMessages
        });
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

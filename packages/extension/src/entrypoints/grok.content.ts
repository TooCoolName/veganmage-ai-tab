import { TabInternalMessageSchema } from "@/schema";
import { chromeMessage, type ChromeResult } from '@toocoolname/chrome-proxy';
import { getMessageText, waitForResponse as genericWaitForResponse, pressEnter, handleGenerateText, pressShortcut } from '@/lib/wxt-utils';

export default defineContentScript({
    matches: ["https://grok.com/*"],
    runAt: 'document_end',
    main() {
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
        chromeMessage.createLocalListener(TabInternalMessageSchema, {
            ping: async (): Promise<ChromeResult<undefined>> => {
                return { success: true, data: undefined };
            },
            create_new_chat: async (): Promise<ChromeResult<undefined>> => {
                createNewChat();
                return { success: true, data: undefined };
            },
            generate_text: async (prompt: string): Promise<ChromeResult<string>> => {
                const getMessages = () => document.querySelectorAll('.message-bubble');
                try {
                    const response = await handleGenerateText(prompt, {
                        inputSelector: 'textarea, [role="textbox"]',
                        findSendButton,
                        pressEnter: () => pressEnter('textarea, [role="textbox"]', true),
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
                getMessages: () => document.querySelectorAll('.message-bubble'),
                isGenerating: (el: Element) => !el.parentElement?.querySelector('button'),
                extractText: getMessageText,
                initialCount
            });
        }
    }
});

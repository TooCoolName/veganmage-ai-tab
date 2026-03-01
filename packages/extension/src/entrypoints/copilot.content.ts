import { TabInternalMessageSchema } from "@/schema";
import { chromeMessage, type ChromeResult } from '@toocoolname/chrome-proxy';
import { getMessageText, waitForResponse as genericWaitForResponse, pressEnter, findSendButton as genericFindSendButton, handleGenerateText } from '@/lib/wxt-utils';

export default defineContentScript({
    matches: ["https://copilot.microsoft.com/*", "https://bing.com/chat*"],
    runAt: 'document_end',
    main() {
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
        chromeMessage.createLocalListener(TabInternalMessageSchema, {
            ping: async (): Promise<ChromeResult<undefined>> => {
                return { success: true, data: undefined };
            },
            create_new_chat: async (): Promise<ChromeResult<undefined>> => {
                createNewChat();
                return { success: true, data: undefined };
            },
            generate_text: async (prompt: string): Promise<ChromeResult<string>> => {
                const getMessages = () => document.querySelectorAll('.group\\/ai-message');
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
                getMessages: () => document.querySelectorAll('.group\\/ai-message'),
                isGenerating: (el: Element) => {
                    return !el.querySelector('button');
                },
                extractText: (el: HTMLElement) => {
                    // Check if this is a group/ai-message container
                    const items = el.querySelectorAll<HTMLElement>('.group\\/ai-message-item');
                    if (items.length > 0) {
                        return Array.from(items)
                            .map((item: HTMLElement) => getMessageText(item))
                            .join('\n\n');
                    }
                    return getMessageText(el);
                },
                initialCount
            });
        }
    }
});

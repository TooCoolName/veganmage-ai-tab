/**
 * Common utilities for content scripts
 */

/**
 * Get text content from an element, preferring innerText to preserve line breaks
 */
export function getMessageText(element: Element | undefined): string {
    if (!element) return '';
    return (element as HTMLElement).innerText ?? element.textContent ?? '';
}

interface WaitForResponseOptions {
    /** Function to get all message elements */
    getMessages: () => NodeListOf<Element> | Element[];
    /** Function to check if the AI is currently generating, from position of message element */
    isGenerating: (el: Element) => boolean;
    /** Function to extract text from a message element */
    extractText?: (el: Element) => string;
    /** Timeout in milliseconds */
    timeout?: number;
    /** Check interval in milliseconds */
    checkInterval?: number;
    /** How many stable iterations are required to consider the response finished */
    minStableIterations?: number;
    /** Optional initial message count to wait for an increase from */
    initialCount?: number;
}

/**
 * Generic helper to wait for an AI response to complete
 */
export function waitForResponse({
    getMessages,
    isGenerating,
    extractText = getMessageText,
    timeout = 30000,
    checkInterval = 1000,
    minStableIterations = 2,
    initialCount: providedInitialCount
}: WaitForResponseOptions): Promise<string> {
    return new Promise((resolve, reject) => {
        const initialCount = providedInitialCount ?? getMessages().length;
        const startTime = Date.now();

        let lastText = "";
        let stableIterations = 0;

        const interval = setInterval(() => {
            if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                reject(new Error('Response generation timed out'));
                return;
            }

            const messages = getMessages();

            // 1. Wait for new message container
            if (messages.length <= initialCount) return;

            // 2. Check if still generating
            const lastMsg = messages[messages.length - 1];
            if (isGenerating(lastMsg)) {
                stableIterations = 0;
                lastText = extractText(lastMsg);
                return;
            }

            // 3. Stability check
            const currentText = extractText(lastMsg);

            if (currentText.length > 0) {
                if (currentText === lastText) {
                    stableIterations++;
                    if (stableIterations >= minStableIterations) {
                        clearInterval(interval);
                        resolve(currentText);
                    }
                } else {
                    lastText = currentText;
                    stableIterations = 0;
                }
            } else if (lastText.length > 0) {
                // If text becomes empty after being non-empty, something is wrong or it's resetting
                // but we usually want to wait for stability of non-empty text.
            }
        }, checkInterval);
    });
}

/**
 * Inject text into a target element using document.execCommand to trigger native behavior
 */
export function injectText(selector: string, text: string): boolean {
    const el = document.querySelector(selector) as HTMLElement;
    if (el) {
        el.focus();
        document.execCommand('insertText', false, text);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }
    return false;
}

/**
 * Dispatch a keyboard shortcut event
 */
export function pressShortcut(options: {
    key: string;
    code: string;
    keyCode: number;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    selector?: string;
}) {
    const { key, code, keyCode, ctrlKey = false, shiftKey = false, altKey = false, metaKey = false, selector } = options;
    const target = selector ? (document.querySelector(selector) ?? document.activeElement ?? document) : (document.activeElement ?? document);

    const event = new KeyboardEvent('keydown', {
        key,
        code,
        keyCode,
        which: keyCode,
        ctrlKey,
        shiftKey,
        altKey,
        metaKey,
        bubbles: true,
        cancelable: true
    });

    target.dispatchEvent(event);
    console.log(`Dispatched shortcut: ${ctrlKey ? 'Ctrl+' : ''}${shiftKey ? 'Shift+' : ''}${key} to`, target);
}

/**
 * Dispatch a Ctrl+Enter keyboard event to trigger message sending
 */
export function pressEnter(selector: string = 'textarea, div[contenteditable="true"], [role="textbox"]') {
    pressShortcut({
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        ctrlKey: true,
        selector
    });
}

/**
 * Find a send button among a list of selectors
 */
export function findSendButton(selectors: string[]): HTMLElement | undefined {
    for (const selector of selectors) {
        const btn = document.querySelector(selector) as HTMLElement;
        if (btn && !(btn as HTMLButtonElement).disabled) {
            // Optional: check visibility if needed, but simple existence + enabled is usually enough
            return btn;
        }
    }
    return undefined;
}

/**
 * Common logic for handling the generate_text action across different AI providers
 */
export function handleGenerateText(
    prompt: string | undefined,
    sendResponse: (response: Record<string, unknown>) => void,
    options: {
        injectText: (prompt: string) => void;
        findSendButton: () => HTMLElement | undefined;
        pressEnter: () => void;
        waitForResponse: (initialCount: number) => Promise<string>;
        getMessages: () => NodeListOf<Element> | Element[];
        delayBeforeSend?: number;
    }
): boolean {
    if (!prompt) {
        sendResponse({ success: false, error: 'No prompt provided' });
        return false;
    }

    // 0. Inject text
    options.injectText(prompt);


    // 1. Wait for injection
    setTimeout(() => {
        // 1. Capture initial message count BEFORE any action    
        const initialCount = options.getMessages().length;
        console.log(`Initial message count: ${initialCount}`);

        const sendButton = options.findSendButton();
        if (sendButton) {
            sendButton.click();
            console.log('Clicked send button');
        } else {
            // Fallback to Ctrl+Enter
            options.pressEnter();
        }
        // 3. Wait for response (1s delay before checking to allow UI to update)
        setTimeout(() => {
            options.waitForResponse(initialCount)
                .then(response => {
                    sendResponse({ success: true, response: response });
                })
                .catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
        }, 1000);
    }, options.delayBeforeSend ?? 500);

    return true; // Keep channel open for async response
}

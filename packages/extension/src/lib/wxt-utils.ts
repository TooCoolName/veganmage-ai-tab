/**
 * Common utilities for content scripts
 */
import { chromeMessage } from '@toocoolname/chrome-proxy';
import { BgInternalMessageSchema } from '@/schema';

const bgMessenger = chromeMessage.createLocalMessenger(BgInternalMessageSchema);


/**
 * Force the tab to appear visible and focused
 */
export function wakeUpTab() {
    window.dispatchEvent(new Event('WAKE_UP'));
}

/**
 * Restore normal tab visibility and focus state
 */
export function sleepTab() {
    window.dispatchEvent(new Event('GO_TO_SLEEP'));
}

/**
 * Logger utility that sends logs to the background script
 */
export const logger = {
    info: (msg: string, params?: Record<string, unknown>) => sendLog('info', msg, params),
    warn: (msg: string, params?: Record<string, unknown>) => sendLog('warn', msg, params),
    error: (msg: string, params?: Record<string, unknown>) => sendLog('error', msg, params),
    debug: (msg: string, params?: Record<string, unknown>) => sendLog('debug', msg, params),
};

function sendLog(level: string, msg: string, params?: Record<string, unknown>) {
    bgMessenger.send('log', { level, msg, ...params }).catch(() => {
        // Fallback to console if background logger fails
        console.log(`[${level.toUpperCase()}] ${msg}`, params ?? '');
    });
}

/**
 * Get text content from an element, preferring innerText to preserve line breaks
 */
export function getMessageText(element: HTMLElement | undefined): string {
    if (!element) return '';
    return element.innerText ?? element.textContent ?? '';
}

interface WaitForResponseOptions {
    /** Function to get all message elements */
    getMessages: () => NodeListOf<HTMLElement> | HTMLElement[];
    /** Function to check if the AI is currently generating, from position of message element */
    isGenerating: (el: Element) => boolean;
    /** Function to extract text from a message element */
    extractText?: (el: HTMLElement) => string;
    /** Timeout in milliseconds */
    timeout?: number;
    /** Check interval in milliseconds */
    checkInterval?: number;
    /** How many stable iterations are required to consider the response finished */
    minStableIterations?: number;
    /** Optional initial message count to wait for an increase from */
    initialCount?: number;
    /** Optional function to provide a specific element to check for generation status */
    isGeneratingCheckArea?: () => Element | undefined;
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
    initialCount: providedInitialCount,
    isGeneratingCheckArea
}: WaitForResponseOptions): Promise<string> {
    const initialCount = providedInitialCount ?? getMessages().length;
    logger.debug('waitForResponse started', { initialCount, timeout, providedInitialCount });

    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void) => {
        let checkArea = undefined
        if (isGeneratingCheckArea) {
            checkArea = isGeneratingCheckArea()
            if (!checkArea) {
                reject(new Error('Check area for response end detection not found'));
                return;
            }
        }

        const startTime = Date.now();

        let lastText = "";
        let stableIterations = 0;
        let detectedNewMessage = false;

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed > timeout) {
                clearInterval(interval);
                logger.error('Response generation timed out', { elapsed, timeout });
                reject(new Error('Response generation timed out'));
                return;
            }

            const messages = getMessages();


            // 1. Wait for new message container
            if (messages.length <= initialCount) {
                return;
            }

            const lastMsg = messages[messages.length - 1];

            if (!detectedNewMessage) {
                detectedNewMessage = true;
                const generating = isGenerating(checkArea ?? lastMsg);
                const text = extractText(lastMsg);
                logger.debug('New message detected', {
                    count: messages.length,
                    isGenerating: generating,
                    textLength: text.length
                });
            }

            // 2. Check if still generating
            const generating = isGenerating(checkArea ?? lastMsg);

            if (generating) {
                if (stableIterations > 0) {
                    logger.debug('AI resumed generating (button found)');
                }
                if (elapsed % 5000 < checkInterval) {
                    logger.debug('AI is still generating...', { elapsed });
                }
                stableIterations = 0;
                lastText = extractText(lastMsg);
                return;
            }

            // 3. Stability check
            const currentText = extractText(lastMsg);

            if (currentText.length > 0) {
                if (currentText === lastText) {
                    stableIterations++;
                    if (stableIterations === 1) {
                        logger.debug('Response text stable, checking for finality', {
                            textLength: currentText.length,
                            preview: currentText.substring(0, 50)
                        });
                    }
                    if (stableIterations >= minStableIterations) {
                        clearInterval(interval);
                        logger.info('Response stable and complete', { iterations: stableIterations, textLength: currentText.length });
                        resolve(currentText);
                    }
                } else {
                    logger.debug('Text changed', {
                        oldLength: lastText.length,
                        newLength: currentText.length
                    });
                    lastText = currentText;
                    stableIterations = 0;
                }
            } else {
                // Text is empty and not generating
                if (elapsed % 5000 < checkInterval) { // Log every ~5s to not spam
                    logger.debug('Waiting for text content...', { isGenerating: generating });
                }
            }
        }, checkInterval);
    });
}

/**
 * Inject text into a target element using document.execCommand to trigger native behavior
 */
export function injectText(selector: string, text: string): boolean {
    const el = document.querySelector<HTMLElement>(selector);
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
export function pressEnter(selector: string, ctrlKey: boolean) {
    pressShortcut({
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        ctrlKey,
        selector
    });
}

/**
 * Find a send button among a list of selectors
 */
export function findSendButton(selectors: string[]): HTMLElement | undefined {
    for (const selector of selectors) {
        const btn = document.querySelector<HTMLButtonElement>(selector);
        if (btn && !btn.disabled) {
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
    options: {
        inputSelector: string;
        findSendButton: () => HTMLElement | undefined;
        pressEnter: () => void;
        waitForResponse: (initialCount: number) => Promise<string>;
        getMessages: () => NodeListOf<Element> | Element[];
        delayBeforeSend?: number;
    }
): Promise<string> {
    if (!prompt) {
        return Promise.reject(new Error('No prompt provided'));
    }

    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void) => {
        const waitStartTime = Date.now();
        const checkInterval = setInterval(() => {
            const inputEl = document.querySelector(options.inputSelector);
            if (inputEl || Date.now() - waitStartTime > 5000) {
                clearInterval(checkInterval);

                if (!inputEl) {
                    return reject(new Error('Input element not found: ' + options.inputSelector));
                }

                // 0. Inject text
                injectText(options.inputSelector, prompt);

                // 1. Wait for injection
                setTimeout(() => {
                    // 2. Capture initial message count BEFORE any action    
                    const initialCount = options.getMessages().length;
                    logger.debug('Initial message count', { initialCount });

                    const sendButton = options.findSendButton();

                    // Wake the tab up right before we send
                    wakeUpTab();

                    if (sendButton) {
                        sendButton.click();
                        logger.info('Clicked send button');
                    } else {
                        // Fallback to Ctrl+Enter
                        options.pressEnter();
                        logger.info('Dispatched Enter shortcut as fallback');
                    }

                    // 3. Wait for response (1s delay before checking to allow UI to update)
                    setTimeout(() => {
                        options.waitForResponse(initialCount)
                            .then((response: string) => {
                                logger.info('Response received successfully');
                                sleepTab();
                                resolve(response);
                            })
                            .catch((error: unknown) => {
                                const errorMessage = error instanceof Error ? error.message : String(error);
                                logger.error('Error waiting for response', { error: errorMessage });
                                sleepTab();
                                reject(new Error(errorMessage));
                            });
                    }, 1000);
                }, options.delayBeforeSend ?? 500);
            }
        }, 100);
    });
}

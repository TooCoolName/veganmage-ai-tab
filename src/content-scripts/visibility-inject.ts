/**
 * This script is injected into the Main World to override visibility properties.
 * It allows the extension to keep the tab "awake" even when it's in the background.
 */

// Listen for a custom 'WAKE_UP' event to force visibility
window.addEventListener('WAKE_UP', () => {
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
    Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    console.log('Tab awakened at:', new Date().toTimeString());
});

// Listen for a custom 'GO_TO_SLEEP' event to restore normal behavior
window.addEventListener('GO_TO_SLEEP', () => {
    // Use Reflect.deleteProperty to avoid lint/TS errors with 'delete' on read-only properties
    // and to avoid prohibited type assertions.
    Reflect.deleteProperty(document, 'visibilityState');
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('blur'));
    console.log('Tab allowed to sleep at:', new Date().toTimeString());
});

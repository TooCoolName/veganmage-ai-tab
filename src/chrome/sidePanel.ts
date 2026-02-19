import { PanelOptions, GetPanelOptions, PanelBehavior, OpenOptions } from './types';

export const sidePanel = {
    setOptions(options: PanelOptions): Promise<void> {
        return chrome.sidePanel.setOptions(options);
    },
    getOptions(options: GetPanelOptions): Promise<PanelOptions> {
        return chrome.sidePanel.getOptions(options);
    },
    setPanelBehavior(behavior: PanelBehavior): Promise<void> {
        return chrome.sidePanel.setPanelBehavior(behavior);
    },
    getPanelBehavior(): Promise<PanelBehavior> {
        return chrome.sidePanel.getPanelBehavior();
    },
    open(options: OpenOptions): Promise<void> {
        // @ts-expect-error - might not be in older @types/chrome
        return chrome.sidePanel.open(options as Parameters<typeof chrome.sidePanel.open>[0]) as Promise<void>;
    }
};

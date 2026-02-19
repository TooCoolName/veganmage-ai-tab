import { PanelOptions, GetPanelOptions, PanelBehavior } from './types';

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
    }
};

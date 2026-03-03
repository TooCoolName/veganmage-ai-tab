import type { SidepanelServices } from "@ui/components/sidepanel/shared";

export interface Provider {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
    icon?: string;
}

export interface AppContext {
    showStatus: (message: string, type: "success" | "error" | "info") => void;
    getProviders: () => Provider[];
    setProviders: (newProviders: Provider[]) => void;
    services: SidepanelServices;
}

export const DEFAULT_PROVIDERS: Provider[] = [
    { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com", enabled: true },
    { id: "gemini", name: "Gemini", url: "https://gemini.google.com", enabled: true },
    { id: "copilot", name: "Copilot", url: "https://copilot.microsoft.com", enabled: true },
    { id: "deepseek", name: "DeepSeek", url: "https://chat.deepseek.com", enabled: true },
    { id: "grok", name: "Grok", url: "https://grok.com", enabled: true },
    { id: "groq", name: "Groq", url: "https://chat.groq.com", enabled: true }
];

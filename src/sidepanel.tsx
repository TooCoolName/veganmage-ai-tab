import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// Interfaces
interface Provider {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
    icon?: string;
}

interface AiTab extends chrome.tabs.Tab {
    provider: string;
    providerName: string;
}

interface StatusMessage {
    message: string;
    type: 'success' | 'error' | 'info';
}

interface Message {
    id: string;
    tabId: number;
    text: string;
    role: 'user' | 'assistant';
    timestamp: number;
}

// Default provider configuration
const DEFAULT_PROVIDERS: Provider[] = [
    { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com', enabled: true },
    { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', enabled: true },
    { id: 'copilot', name: 'Copilot', url: 'https://copilot.microsoft.com', enabled: true },
    { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com', enabled: true },
    { id: 'grok', name: 'Grok', url: 'https://grok.com', enabled: true }
];

const STORAGE_KEY = 'providerSettings';

// Main App Component
function App() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [activeTabs, setActiveTabs] = useState<AiTab[]>([]);
    const [theme, setTheme] = useState<string>('custom-light');
    const [statusMessage, setStatusMessage] = useState<StatusMessage | undefined>(undefined);
    const [activeView, setActiveView] = useState<'providers' | 'messaging'>('providers');
    const [messageText, setMessageText] = useState<string>('');
    const [selectedTab, setSelectedTab] = useState<AiTab | undefined>(undefined);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [draggedIndex, setDraggedIndex] = useState<number | undefined>(undefined);

    // Apply theme to body
    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
    }, [theme]);

    // Load providers from storage
    const loadProviders = useCallback(async () => {
        try {
            const result = await chrome.storage.local.get(STORAGE_KEY);
            const loadedProviders: Provider[] = result[STORAGE_KEY] ?? [...DEFAULT_PROVIDERS];

            // Migration: Ensure URLs exist and icons are removed if they were saved before
            const updatedProviders = loadedProviders.map(p => {
                const defaultP = DEFAULT_PROVIDERS.find(dp => dp.id === p.id);
                return {
                    ...p,
                    url: p.url ?? defaultP?.url ?? '',
                    icon: undefined // Explicitly remove icon
                };
            });

            setProviders(updatedProviders);
        } catch (error) {
            console.error('Error loading providers:', error);
            setProviders([...DEFAULT_PROVIDERS]);
        }
    }, []);

    // Load theme from storage
    const loadTheme = useCallback(async () => {
        try {
            const result = await chrome.storage.local.get('theme');
            setTheme(result.theme ?? 'custom-light');
        } catch (error) {
            console.error('Error loading theme:', error);
        }
    }, []);

    // Load active tabs
    const loadActiveTabs = useCallback(async () => {
        try {
            const tabs = await chrome.tabs.query({});
            const aiTabs = tabs.filter(tab => {
                const url = tab.url ?? '';
                return url.includes('chatgpt.com') ||
                    url.includes('chat.openai.com') ||
                    url.includes('gemini.google.com') ||
                    url.includes('copilot.microsoft.com') ||
                    url.includes('bing.com/chat') ||
                    url.includes('chat.deepseek.com') ||
                    url.includes('grok.com');
            }).map(tab => {
                let provider = 'unknown';
                const url = tab.url ?? '';
                if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) provider = 'chatgpt';
                else if (url.includes('gemini.google.com')) provider = 'gemini';
                else if (url.includes('copilot.microsoft.com') || url.includes('bing.com/chat')) provider = 'copilot';
                else if (url.includes('chat.deepseek.com')) provider = 'deepseek';
                else if (url.includes('grok.com')) provider = 'grok';

                // Find provider name safely
                const providerObj = providers.find(p => p.id === provider);
                const providerName = providerObj ? providerObj.name : provider;

                return {
                    ...tab,
                    provider,
                    providerName
                } as AiTab;
            });
            setActiveTabs(aiTabs);
        } catch (error) {
            console.error('Error loading tabs:', error);
        }
    }, [providers]);

    // Save providers to storage
    const saveProviders = async () => {
        try {
            await chrome.storage.local.set({ [STORAGE_KEY]: providers });
            showStatus('Settings saved', 'success');

            // Notify background script
            chrome.runtime.sendMessage({
                action: 'provider_settings_updated',
                providers: providers
            }).catch(() => { });
        } catch (error) {
            console.error('Error saving providers:', error);
            showStatus('Failed to save settings', 'error');
        }
    };

    // Toggle theme
    const toggleTheme = () => {
        const newTheme = theme === 'custom-light' ? 'custom-dark' : 'custom-light';
        setTheme(newTheme);
        chrome.storage.local.set({ theme: newTheme });
    };

    // Show status message
    const showStatus = (message: string, type: 'success' | 'error' | 'info') => {
        setStatusMessage({ message, type });
        setTimeout(() => setStatusMessage(undefined), 5000);
    };

    // Handle provider toggle
    const handleToggle = (index: number, enabled: boolean) => {
        const enabledCount = providers.filter(p => p.enabled).length;
        if (!enabled && enabledCount === 1) {
            showStatus('At least one provider must remain enabled', 'error');
            return;
        }

        const newProviders = [...providers];
        newProviders[index].enabled = enabled;
        setProviders(newProviders);
    };

    // Handle drag start
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    // Handle drag over
    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (!draggedIndex || draggedIndex === index) return;

        const newProviders = [...providers];
        const [removed] = newProviders.splice(draggedIndex, 1);
        newProviders.splice(index, 0, removed);
        setProviders(newProviders);
        setDraggedIndex(index);
    };

    // Handle drag end
    const handleDragEnd = () => {
        setDraggedIndex(undefined);
    };

    // Reset to default
    const resetToDefault = () => {
        if (confirm('Reset to default settings?')) {
            setProviders([...DEFAULT_PROVIDERS]);
            saveProviders();
        }
    };

    // Send message to tab
    const sendMessageToTab = async () => {
        if (!selectedTab || !messageText.trim()) {
            showStatus('Select a tab and enter a message', 'error');
            return;
        }

        if (!selectedTab.id) {
            showStatus('Selected tab has no ID', 'error');
            return;
        }

        const prompt = messageText;
        const currentTabId = selectedTab.id;

        // Add user message to state
        const userMsg: Message = {
            id: crypto.randomUUID(),
            tabId: currentTabId,
            text: prompt,
            role: 'user',
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMsg]);
        setMessageText('');
        setIsSending(true);

        try {
            const result = await chrome.tabs.sendMessage(currentTabId, {
                action: 'generate_text',
                prompt: prompt
            });

            if (result?.success) {
                const assistantMsg: Message = {
                    id: crypto.randomUUID(),
                    tabId: currentTabId,
                    text: result.response,
                    role: 'assistant',
                    timestamp: Date.now()
                };
                setMessages(prev => [...prev, assistantMsg]);
                showStatus('Response received', 'success');
            } else {
                showStatus(`Failed: ${result?.error ?? 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            showStatus(`Failed: ${(error as Error).message}`, 'error');
        } finally {
            setIsSending(false);
        }
    };

    // Create new chat
    const createNewChat = async () => {
        if (!selectedTab) {
            showStatus('Select a tab first', 'error');
            return;
        }

        if (!selectedTab.id) {
            showStatus('Selected tab has no ID', 'error');
            return;
        }

        try {
            await chrome.tabs.sendMessage(selectedTab.id, {
                action: 'create_new_chat'
            });
            showStatus('New chat created', 'success');
        } catch (error) {
            console.error('Error creating new chat:', error);
            showStatus(`Failed: ${(error as Error).message}`, 'error');
        }
    };


    // Load providers and tabs on mount
    useEffect(() => {
        const init = async () => {
            await loadProviders();
            await loadTheme();
            await loadActiveTabs();
        };
        init();
    }, [loadProviders, loadTheme, loadActiveTabs]);

    // Refresh tabs periodically
    useEffect(() => {
        const interval = setInterval(loadActiveTabs, 5000);
        return () => clearInterval(interval);
    }, [loadActiveTabs]);

    return (
        <div className="min-h-screen bg-base-100 p-4 relative">
            {/* Status Message */}
            {statusMessage && (
                <div className="toast toast-top toast-center z-[100]">
                    <div className={`alert alert-${statusMessage.type} py-8 shadow-lg`}>
                        <span className="font-medium">{statusMessage.message}</span>
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <header className="mb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-xl font-bold text-base-content mb-1">
                                Vegan Mage AI tabs
                            </h1>
                        </div>
                        <button onClick={toggleTheme} className="btn btn-xs btn-ghost gap-2">
                            <span>{theme === 'custom-dark' ? 'Light' : 'Dark'} Mode</span>
                        </button>
                    </div>
                </header>

                {/* View Tabs */}
                <div className="tabs tabs-boxed mb-4">
                    <button
                        className={`tab tab-sm ${activeView === 'providers' ? 'tab-active' : ''}`}
                        onClick={() => setActiveView('providers')}
                    >
                        Providers
                    </button>
                    <button
                        className={`tab tab-sm ${activeView === 'messaging' ? 'tab-active' : ''}`}
                        onClick={() => setActiveView('messaging')}
                    >
                        Messages
                    </button>
                </div>

                {/* Provider Settings View */}
                {activeView === 'providers' && (
                    <ProviderSettings
                        providers={providers}
                        draggedIndex={draggedIndex}
                        onToggle={handleToggle}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        onSave={saveProviders}
                        onReset={resetToDefault}
                    />
                )}

                {/* Messaging View */}
                {activeView === 'messaging' && (
                    <MessagingView
                        activeTabs={activeTabs}
                        selectedTab={selectedTab}
                        messageText={messageText}
                        messages={messages}
                        isSending={isSending}
                        onSelectTab={setSelectedTab}
                        onMessageChange={setMessageText}
                        onSendMessage={sendMessageToTab}
                        onRefresh={loadActiveTabs}
                        onNewChat={createNewChat}
                    />
                )}

            </div>
        </div>
    );
}

interface ProviderSettingsProps {
    providers: Provider[];
    draggedIndex: number | undefined;
    onToggle: (index: number, enabled: boolean) => void;
    onDragStart: (index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
    onSave: () => void;
    onReset: () => void;
}

// Provider Settings Component
function ProviderSettings({ providers, draggedIndex, onToggle, onDragStart, onDragOver, onDragEnd, onSave, onReset }: ProviderSettingsProps) {
    return (
        <div className="card bg-base-200 shadow-lg">
            <div className="card-body p-4">
                <h2 className="card-title text-lg mb-2">
                    Providers
                </h2>

                <p className="text-xs text-base-content/60 mb-2">
                    Drag to reorder • Toggle to enable
                </p>

                <div className="space-y-2">
                    {providers.map((provider, index) => (
                        <div
                            key={provider.id}
                            draggable
                            onDragStart={() => onDragStart(index)}
                            onDragOver={(e) => onDragOver(e, index)}
                            onDragEnd={onDragEnd}
                            className={`flex items-center gap-2 p-2 bg-base-100 rounded border transition-all cursor-move ${draggedIndex === index ? 'opacity-40' : 'border-base-300 hover:border-primary/40'
                                }`}
                        >
                            <div className="drag-handle flex items-center justify-center w-6 h-6 text-base-content/30 hover:text-base-content cursor-grab active:cursor-grabbing">
                                ☰
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-base-content truncate">{provider.name}</div>
                                <a
                                    href={provider.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-primary hover:underline block truncate"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {provider.url}
                                </a>
                            </div>

                            <label className="swap">
                                <input
                                    type="checkbox"
                                    checked={provider.enabled}
                                    onChange={(e) => onToggle(index, e.target.checked)}
                                />
                                <div className="swap-on text-xs text-success font-bold">ON</div>
                                <div className="swap-off text-xs text-base-content/30 font-bold">OFF</div>
                            </label>
                        </div>
                    ))}
                </div>

                <div className="card-actions justify-end mt-4">
                    <button onClick={onSave} className="btn btn-primary btn-sm">
                        Save
                    </button>
                    <button onClick={onReset} className="btn btn-ghost btn-sm">
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
}

interface MessagingViewProps {
    activeTabs: AiTab[];
    selectedTab: AiTab | undefined;
    messageText: string;
    messages: Message[];
    isSending: boolean;
    onSelectTab: (tab: AiTab | undefined) => void;
    onMessageChange: (text: string) => void;
    onSendMessage: () => void;
    onRefresh: () => void;
    onNewChat: () => void;
}

// Messaging View Component
function MessagingView({
    activeTabs,
    selectedTab,
    messageText,
    messages,
    isSending,
    onSelectTab,
    onMessageChange,
    onSendMessage,
    onRefresh,
    onNewChat
}: MessagingViewProps) {
    // eslint-disable-next-line no-restricted-syntax
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // Show only the last exchange (user prompt + AI response)
    const filteredMessages = messages
        .filter(m => m.tabId === selectedTab?.id)
        .slice(-2);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [filteredMessages, isSending]);

    return (
        <div className="space-y-4">
            {/* Active Tabs List */}
            <div className="card bg-base-200 shadow-lg">
                <div className="card-body p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="card-title text-lg">
                            Active Tabs ({activeTabs.length})
                        </h2>
                        <button onClick={onRefresh} className="btn btn-xs btn-ghost underline">
                            Refresh
                        </button>
                    </div>

                    {activeTabs.length === 0 ? (
                        <div className="text-center py-4 text-base-content/50">
                            <p className="text-sm">No active AI tabs found</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {activeTabs.map((tab) => (
                                <div
                                    key={tab.id}
                                    onClick={() => onSelectTab(tab)}
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${selectedTab?.id === tab.id
                                        ? 'bg-primary text-primary-content shadow-sm'
                                        : 'bg-base-100 hover:bg-base-300'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{tab.title}</div>
                                        <div className="text-[10px] opacity-70 truncate">{tab.providerName}</div>
                                    </div>
                                    {tab.active && (
                                        <span className="badge badge-xs badge-outline">Active</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Message History & Composer */}
            {selectedTab && (
                <div className="card bg-base-200 shadow-lg overflow-hidden">
                    <div className="card-body p-0">
                        {/* Messages Area */}
                        <div
                            ref={scrollRef}
                            className="h-[350px] overflow-y-auto p-4 space-y-4 bg-base-100/50 scroll-smooth"
                        >
                            {filteredMessages.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-base-content/30 italic text-sm">
                                    No messages yet for this tab
                                </div>
                            ) : (
                                filteredMessages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}
                                    >
                                        <div className="chat-header opacity-50 text-[10px] mb-1">
                                            {msg.role === 'user' ? 'You' : selectedTab.providerName}
                                        </div>
                                        <div className={`chat-bubble text-sm ${msg.role === 'user'
                                            ? 'chat-bubble-primary'
                                            : 'chat-bubble-base-300'
                                            }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))
                            )}
                            {isSending && (
                                <div className="chat chat-start">
                                    <div className="chat-header opacity-50 text-[10px] mb-1">
                                        {selectedTab.providerName}
                                    </div>
                                    <div className="chat-bubble chat-bubble-base-300 opacity-70">
                                        <span className="loading loading-dots loading-sm"></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Composer Area */}
                        <div className="p-4 bg-base-200 border-t border-base-300">
                            <div className="flex flex-col gap-3">
                                <textarea
                                    className="textarea textarea-bordered w-full h-20 text-sm"
                                    placeholder="Enter message..."
                                    value={messageText}
                                    onChange={(e) => onMessageChange(e.target.value)}
                                    disabled={isSending}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                            onSendMessage();
                                        }
                                    }}
                                />

                                <div className="flex gap-2 justify-between items-center">
                                    <div className="text-[10px] opacity-50">
                                        Ctrl+Enter to send
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onSelectTab(undefined)}
                                            className="btn btn-ghost btn-xs"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={onNewChat}
                                            className="btn btn-secondary btn-xs"
                                        >
                                            New Chat
                                        </button>
                                        <button
                                            onClick={onSendMessage}
                                            disabled={!messageText.trim() || isSending}
                                            className={`btn btn-primary btn-xs ${isSending ? 'loading' : ''}`}
                                        >
                                            {isSending ? 'Sending...' : 'Send'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!selectedTab && (
                <div className="card bg-base-200 shadow-lg">
                    <div className="card-body p-8 items-center text-center text-base-content/50">
                        <p className="text-sm">Select a tab from the list above to start messaging</p>
                    </div>
                </div>
            )}
        </div>
    );
}


// Mount the app
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}

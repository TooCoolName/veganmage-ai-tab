<script lang="ts">
    import { getContext, onMount } from "svelte";
    import {
        chromeMessage,
        chromeTabs,
        type Tab,
    } from "@toocoolname/chrome-proxy";
    import { TabInternalMessageSchema } from "$lib/../schema";
    import { fireAndForget } from "$lib/utils/chrome-utils";
    import type { AppContext } from "./types";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Textarea } from "$lib/components/ui/textarea";
    import { ScrollArea } from "$lib/components/ui/scroll-area";
    import {
        MessageSquare,
        Bot,
        User,
        Plus,
        Send,
        RefreshCw,
        Monitor,
        ChevronRight,
    } from "lucide-svelte";

    const tabMessenger = chromeMessage.createTabMessenger(
        TabInternalMessageSchema,
    );

    const { showStatus, getProviders } = getContext<AppContext>("app");

    interface AiTab extends Tab {
        provider: string;
        providerName: string;
    }

    interface Message {
        id: string;
        tabId: number;
        text: string;
        role: "user" | "assistant";
        timestamp: number;
    }

    let activeTabs = $state<AiTab[]>([]);
    let selectedTab = $state<AiTab>();
    let messageText = $state<string>("");
    let messages = $state<Message[]>([]);
    let isSending = $state<boolean>(false);

    let scrollRef = $state<HTMLDivElement>();

    const filteredMessages = $derived(
        messages.filter((m) => m.tabId === selectedTab?.id),
    );

    $effect(() => {
        if (filteredMessages.length || isSending) {
            if (scrollRef) {
                setTimeout(() => {
                    scrollRef!.scrollTo({
                        top: scrollRef!.scrollHeight,
                        behavior: "smooth",
                    });
                }, 50);
            }
        }
    });

    export const loadActiveTabs = async () => {
        try {
            const allTabs = await chromeTabs.query({});
            const providersList = getProviders();

            const tabs = allTabs
                .filter((tab) => {
                    const url = tab.url ?? "";
                    return (
                        url.includes("chatgpt.com") ||
                        url.includes("chat.openai.com") ||
                        url.includes("gemini.google.com") ||
                        url.includes("copilot.microsoft.com") ||
                        url.includes("bing.com/chat") ||
                        url.includes("chat.deepseek.com") ||
                        url.includes("grok.com") ||
                        url.includes("chat.groq.com")
                    );
                })
                .map((tab) => {
                    let provider = "unknown";
                    const url = tab.url ?? "";
                    if (
                        url.includes("chatgpt.com") ||
                        url.includes("chat.openai.com")
                    )
                        provider = "chatgpt";
                    else if (url.includes("gemini.google.com"))
                        provider = "gemini";
                    else if (
                        url.includes("copilot.microsoft.com") ||
                        url.includes("bing.com/chat")
                    )
                        provider = "copilot";
                    else if (url.includes("chat.deepseek.com"))
                        provider = "deepseek";
                    else if (url.includes("grok.com")) provider = "grok";
                    else if (url.includes("chat.groq.com")) provider = "groq";

                    const providerObj = providersList.find(
                        (p) => p.id === provider,
                    );
                    const providerName = providerObj
                        ? providerObj.name
                        : provider;

                    return {
                        ...tab,
                        provider,
                        providerName,
                    };
                });

            activeTabs = tabs;
        } catch (error) {
            console.error("Error loading tabs:", error);
        }
    };

    async function sendMessageToTab() {
        if (!selectedTab || !messageText.trim()) {
            showStatus("Select a tab and enter a message", "error");
            return;
        }

        if (!selectedTab.id) {
            showStatus("Selected tab has no ID", "error");
            return;
        }

        const prompt = messageText;
        const currentTabId = selectedTab.id;

        const userMsg: Message = {
            id: crypto.randomUUID(),
            tabId: currentTabId,
            text: prompt,
            role: "user",
            timestamp: Date.now(),
        };

        messages = [...messages, userMsg];
        messageText = "";
        isSending = true;

        try {
            const result = await tabMessenger.send(
                currentTabId,
                "generate_text",
                prompt,
            );

            if (result.success) {
                const assistantMsg: Message = {
                    id: crypto.randomUUID(),
                    tabId: currentTabId,
                    text: result.data,
                    role: "assistant",
                    timestamp: Date.now(),
                };
                messages = [...messages, assistantMsg];
            } else {
                showStatus(
                    `Failed: ${result.error ?? "Unknown error"}`,
                    "error",
                );
            }
        } catch (err: unknown) {
            console.error("Error sending:", err);
            const errorMessage = err instanceof Error ? err.message : "Error";
            showStatus(`Failed: ${errorMessage}`, "error");
        } finally {
            isSending = false;
        }
    }

    async function createNewChat() {
        if (!selectedTab?.id) return;
        try {
            const result = await tabMessenger.send(
                selectedTab.id,
                "create_new_chat",
                undefined,
            );
            if (result.success) {
                showStatus("New chat created", "success");
            } else {
                showStatus("Failed to create chat", "error");
            }
        } catch {
            showStatus("Error creating chat", "error");
        }
    }

    onMount(() => {
        fireAndForget(loadActiveTabs(), "loadActiveTabs");
        const interval = setInterval(() => {
            fireAndForget(loadActiveTabs(), "loadActiveTabs interval");
        }, 5000);
        return () => clearInterval(interval);
    });
</script>

<div class="flex flex-col h-full gap-4">
    <!-- Active Tabs List -->
    <Card.Root class="shrink-0">
        <Card.Header class="p-4 pb-0 mb-3">
            <div class="flex justify-between items-center">
                <Card.Title class="text-base text-card-foreground">
                    Active Tabs ({activeTabs.length})
                </Card.Title>
                <Button
                    variant="ghost"
                    size="sm"
                    class="h-8 w-8 p-0"
                    onclick={loadActiveTabs}
                    title="Refresh tabs"
                >
                    <RefreshCw class="h-4 w-4" />
                </Button>
            </div>
        </Card.Header>

        <Card.Content class="p-4 pt-0">
            {#if activeTabs.length === 0}
                <div class="text-center py-4 text-muted-foreground">
                    <p class="text-sm">No active AI tabs found</p>
                </div>
            {:else}
                <ScrollArea class="h-40 pr-3">
                    <div class="space-y-2">
                        {#each activeTabs as tab (tab.id)}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                onclick={() => (selectedTab = tab)}
                                class="group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border {selectedTab?.id ===
                                tab.id
                                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                    : 'bg-card hover:bg-accent hover:text-accent-foreground border-border/50'}"
                            >
                                <div
                                    class="shrink-0 p-2 rounded-md {selectedTab?.id ===
                                    tab.id
                                        ? 'bg-primary-foreground/20'
                                        : 'bg-muted'}"
                                >
                                    <Monitor class="h-4 w-4" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm truncate">
                                        {tab.title}
                                    </div>
                                    <div
                                        class="text-[10px] opacity-70 truncate uppercase tracking-wider font-bold"
                                    >
                                        {tab.providerName}
                                    </div>
                                </div>
                                {#if tab.active}
                                    <div
                                        class="h-2 w-2 rounded-full {selectedTab?.id ===
                                        tab.id
                                            ? 'bg-primary-foreground animate-pulse'
                                            : 'bg-green-500'}"
                                    ></div>
                                {/if}
                                <ChevronRight
                                    class="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            </div>
                        {/each}
                    </div>
                </ScrollArea>
            {/if}
        </Card.Content>
    </Card.Root>

    <!-- Message History & Composer -->
    {#if selectedTab}
        <Card.Root class="overflow-hidden flex-1 flex flex-col min-h-0">
            <div class="flex flex-col h-full min-h-0">
                <!-- Messages -->
                <ScrollArea class="flex-1 bg-muted/30">
                    <div
                        bind:this={scrollRef}
                        class="p-4 space-y-4 scroll-smooth min-h-0"
                    >
                        {#if filteredMessages.length === 0}
                            <div
                                class="h-64 flex flex-col items-center justify-center text-muted-foreground italic text-sm gap-2"
                            >
                                <MessageSquare class="h-12 w-12 opacity-10" />
                                <p>No messages yet for this tab</p>
                            </div>
                        {:else}
                            {#each filteredMessages as msg (msg.id)}
                                <div
                                    class="flex flex-col {msg.role === 'user'
                                        ? 'items-end'
                                        : 'items-start'}"
                                >
                                    <div
                                        class="flex items-center gap-1.5 opacity-50 text-[10px] mb-1 px-1"
                                    >
                                        {#if msg.role === "user"}
                                            <span>You</span>
                                            <User class="h-3 w-3" />
                                        {:else}
                                            <Bot class="h-3 w-3" />
                                            <span
                                                >{selectedTab.providerName}</span
                                            >
                                        {/if}
                                    </div>
                                    <div
                                        class="text-sm px-4 py-2.5 rounded-2xl max-w-[90%] shadow-sm break-words {msg.role ===
                                        'user'
                                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                            : 'bg-card text-card-foreground border rounded-tl-sm'}"
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            {/each}
                        {/if}

                        {#if isSending}
                            <div
                                class="flex flex-col items-start scale-95 origin-left opacity-70"
                            >
                                <div
                                    class="flex items-center gap-1.5 opacity-50 text-[10px] mb-1 px-1"
                                >
                                    <Bot class="h-3 w-3" />
                                    <span>{selectedTab.providerName}</span>
                                </div>
                                <div
                                    class="text-sm px-4 py-2 rounded-2xl bg-card border text-foreground rounded-tl-sm w-16 flex justify-center"
                                >
                                    <span class="animate-pulse">...</span>
                                </div>
                            </div>
                        {/if}
                    </div>
                </ScrollArea>

                <!-- Composer -->
                <div class="p-4 bg-background border-t">
                    <div class="flex flex-col gap-3">
                        <Textarea
                            class="h-20 resize-none"
                            placeholder="Enter message..."
                            bind:value={messageText}
                            disabled={isSending}
                            onkeydown={(e: KeyboardEvent) => {
                                if (
                                    e.key === "Enter" &&
                                    (e.ctrlKey || e.metaKey)
                                ) {
                                    fireAndForget(
                                        sendMessageToTab(),
                                        "sendMessageToTab",
                                    );
                                }
                            }}
                        />

                        <div class="flex gap-2 justify-between items-center">
                            <div class="text-[10px] text-muted-foreground">
                                Ctrl+Enter to send
                            </div>
                            <div class="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    class="h-9"
                                    onclick={() => (selectedTab = undefined)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    class="h-9 gap-1.5"
                                    onclick={createNewChat}
                                >
                                    <Plus class="h-3.5 w-3.5" />
                                    New Chat
                                </Button>
                                <Button
                                    size="sm"
                                    class="h-9 gap-1.5"
                                    onclick={sendMessageToTab}
                                    disabled={!messageText.trim() || isSending}
                                >
                                    {#if isSending}
                                        <RefreshCw
                                            class="h-3.5 w-3.5 animate-spin"
                                        />
                                        Sending...
                                    {:else}
                                        <Send class="h-3.5 w-3.5" />
                                        Send
                                    {/if}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card.Root>
    {/if}

    {#if !selectedTab}
        <Card.Root class="flex-1 bg-muted/10 border-dashed">
            <Card.Content
                class="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-12 gap-4"
            >
                <div class="p-6 rounded-full bg-muted/50">
                    <MessageSquare class="h-12 w-12 opacity-20" />
                </div>
                <div class="max-w-[200px] space-y-1">
                    <p class="text-base font-semibold text-foreground/70">
                        No conversation selected
                    </p>
                    <p class="text-xs">
                        Select an active AI tab from the list above to start
                        messaging
                    </p>
                </div>
            </Card.Content>
        </Card.Root>
    {/if}
</div>

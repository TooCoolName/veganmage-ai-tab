<script lang="ts">
    import { getContext, onMount } from "svelte";
    import {
        chromeMessage,
        chromeTabs,
        type Tab,
    } from "@toocoolname/chrome-proxy";
    import { TabInternalMessageSchema } from "@/schema";
    import { fireAndForget } from "@/utils";
    import type { AppContext } from "./types";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Textarea } from "$lib/components/ui/textarea";

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
        messages.filter((m) => m.tabId === selectedTab?.id).slice(-2),
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
                    variant="link"
                    size="sm"
                    class="h-auto p-0 text-xs"
                    onclick={loadActiveTabs}
                >
                    Refresh
                </Button>
            </div>
        </Card.Header>

        <Card.Content class="p-4 pt-0">
            {#if activeTabs.length === 0}
                <div class="text-center py-4 text-muted-foreground">
                    <p class="text-sm">No active AI tabs found</p>
                </div>
            {:else}
                <div class="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {#each activeTabs as tab (tab.id)}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div
                            onclick={() => (selectedTab = tab)}
                            class="flex items-center gap-2 p-2 rounded cursor-pointer transition-all border {selectedTab?.id ===
                            tab.id
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-background hover:bg-muted border-transparent'}"
                        >
                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-sm truncate">
                                    {tab.title}
                                </div>
                                <div class="text-[10px] opacity-70 truncate">
                                    {tab.providerName}
                                </div>
                            </div>
                            {#if tab.active}
                                <div
                                    class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors bg-transparent {selectedTab?.id ===
                                    tab.id
                                        ? 'text-primary-foreground border-primary-foreground/30'
                                        : 'text-foreground'}"
                                >
                                    Active
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}
        </Card.Content>
    </Card.Root>

    <!-- Message History & Composer -->
    {#if selectedTab}
        <Card.Root class="overflow-hidden flex-1 flex flex-col min-h-0">
            <div class="flex flex-col h-full min-h-0">
                <!-- Messages -->
                <div
                    bind:this={scrollRef}
                    class="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30 scroll-smooth min-h-0"
                >
                    {#if filteredMessages.length === 0}
                        <div
                            class="h-full flex items-center justify-center text-muted-foreground italic text-sm"
                        >
                            No messages yet for this tab
                        </div>
                    {:else}
                        {#each filteredMessages as msg (msg.id)}
                            <div
                                class="flex flex-col {msg.role === 'user'
                                    ? 'items-end'
                                    : 'items-start'}"
                            >
                                <div class="opacity-50 text-[10px] mb-1">
                                    {msg.role === "user"
                                        ? "You"
                                        : selectedTab.providerName}
                                </div>
                                <div
                                    class="text-sm px-4 py-2 rounded-2xl max-w-[85%] break-words {msg.role ===
                                    'user'
                                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                        : 'bg-muted text-foreground rounded-tl-sm'}"
                                >
                                    {msg.text}
                                </div>
                            </div>
                        {/each}
                    {/if}

                    {#if isSending}
                        <div class="flex flex-col items-start">
                            <div class="opacity-50 text-[10px] mb-1">
                                {selectedTab.providerName}
                            </div>
                            <div
                                class="text-sm px-4 py-2 rounded-2xl bg-muted text-foreground rounded-tl-sm w-16 flex justify-center opacity-70"
                            >
                                <span class="animate-pulse">...</span>
                            </div>
                        </div>
                    {/if}
                </div>

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
                                    onclick={() => (selectedTab = undefined)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onclick={createNewChat}
                                >
                                    New Chat
                                </Button>
                                <Button
                                    size="sm"
                                    onclick={sendMessageToTab}
                                    disabled={!messageText.trim() || isSending}
                                >
                                    {isSending ? "Sending..." : "Send"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card.Root>
    {/if}

    {#if !selectedTab}
        <Card.Root>
            <Card.Content
                class="p-8 flex items-center justify-center text-center text-muted-foreground"
            >
                <p class="text-sm">
                    Select a tab from the list above to start messaging
                </p>
            </Card.Content>
        </Card.Root>
    {/if}
</div>

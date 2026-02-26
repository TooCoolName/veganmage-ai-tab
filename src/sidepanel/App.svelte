<script lang="ts">
    import { onMount, setContext } from "svelte";
    import { chromeStorage } from "@toocoolname/chrome-proxy";
    import { fireAndForget } from "@/utils";
    import ProviderSettings from "./ProviderSettings.svelte";
    import MessagingView from "./MessagingView.svelte";
    import { DEFAULT_PROVIDERS, type Provider } from "./types";

    const PROVIDERS_KEY = "providerSettings";
    const THEME_KEY = "theme";

    let theme = $state("custom-light");
    let activeView = $state<"providers" | "messaging">("providers");
    type StatusMessage = {
        message: string;
        type: "success" | "error" | "info";
    };
    let statusMessage = $state<StatusMessage>({ message: "", type: "info" });
    let showStatusMessage = $state(false);

    let providers = $state(DEFAULT_PROVIDERS);

    // Apply theme instantly
    $effect(() => {
        document.body.setAttribute("data-theme", theme);
    });

    const loadTheme = async () => {
        try {
            const result =
                (await chromeStorage.local.get<string>(THEME_KEY)) ??
                "custom-light";
            theme = result;
        } catch (error) {
            console.error("Error loading theme:", error);
        }
    };

    const loadProviders = async () => {
        try {
            const loadedProviders =
                (await chromeStorage.local.get<Provider[]>(PROVIDERS_KEY)) ??
                DEFAULT_PROVIDERS;
            providers = loadedProviders.map((p) => {
                const defaultP = DEFAULT_PROVIDERS.find((dp) => dp.id === p.id);
                return {
                    ...p,
                    url: p.url ?? defaultP?.url ?? "",
                    icon: undefined,
                };
            });
        } catch (error) {
            console.error("Error loading providers:", error);
            providers = [...DEFAULT_PROVIDERS];
        }
    };

    function showStatus(message: string, type: "success" | "error" | "info") {
        statusMessage = { message, type };
        showStatusMessage = true;
        setTimeout(() => (showStatusMessage = false), 5000);
    }

    // To allow child components to trigger global events
    setContext("app", {
        showStatus,
        getProviders: () => providers,
        setProviders: (newProviders: Provider[]) => {
            providers = newProviders;
        },
    });

    function toggleTheme() {
        theme = theme === "custom-light" ? "custom-dark" : "custom-light";
        fireAndForget(chromeStorage.local.set(THEME_KEY, theme), "toggleTheme");
    }

    onMount(() => {
        fireAndForget(loadProviders(), "loadProviders");
        fireAndForget(loadTheme(), "loadTheme");
    });
</script>

<div class="h-screen bg-base-100 p-4 relative flex flex-col overflow-hidden">
    {#if showStatusMessage}
        <div class="toast toast-top toast-center z-[100]">
            <div
                class="alert py-8 shadow-lg {statusMessage.type === 'success'
                    ? 'alert-success'
                    : statusMessage.type === 'error'
                      ? 'alert-error'
                      : 'alert-info'}"
            >
                <span class="font-medium">{statusMessage.message}</span>
            </div>
        </div>
    {/if}

    <div class="max-w-4xl mx-auto w-full flex flex-col h-full">
        <header class="mb-4">
            <div class="flex justify-between items-start">
                <div>
                    <h1 class="text-xl font-bold text-base-content mb-1">
                        Vegan Mage AI tabs
                    </h1>
                </div>
                <button
                    onclick={toggleTheme}
                    class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3"
                >
                    <span
                        >{theme === "custom-dark" ? "Light" : "Dark"} Mode</span
                    >
                </button>
            </div>
        </header>

        <div
            class="flex select-none space-x-1 rounded-lg bg-base-200 p-1 mb-4 h-10 w-fit items-center justify-center text-muted-foreground"
        >
            <button
                class="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeView ===
                'providers'
                    ? 'bg-background text-foreground shadow-sm'
                    : ''}"
                onclick={() => (activeView = "providers")}
            >
                Providers
            </button>
            <button
                class="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeView ===
                'messaging'
                    ? 'bg-background text-foreground shadow-sm'
                    : ''}"
                onclick={() => (activeView = "messaging")}
            >
                Messages
            </button>
        </div>

        {#if activeView === "providers"}
            <div class="flex-1 overflow-y-auto min-h-0 p-1">
                <ProviderSettings />
            </div>
        {:else if activeView === "messaging"}
            <div class="flex-1 min-h-0 flex flex-col">
                <MessagingView />
            </div>
        {/if}
    </div>
</div>

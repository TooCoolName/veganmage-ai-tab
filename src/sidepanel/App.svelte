<script lang="ts">
    import { onMount, setContext } from "svelte";
    import { chromeStorage } from "@toocoolname/chrome-proxy";
    import { fireAndForget } from "@/utils";
    import ProviderSettings from "./ProviderSettings.svelte";
    import MessagingView from "./MessagingView.svelte";
    import { DEFAULT_PROVIDERS, type Provider } from "./types";
    import { Button } from "$lib/components/ui/button";
    import * as Tabs from "$lib/components/ui/tabs";
    import { Toaster } from "$lib/components/ui/sonner";
    import { toast } from "svelte-sonner";

    const PROVIDERS_KEY = "providerSettings";
    const THEME_KEY = "theme";

    let theme = $state("custom-light");
    let activeView = $state<"providers" | "messaging">("providers");

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
        if (type === "error") {
            toast.error(message);
        } else if (type === "success") {
            toast.success(message);
        } else {
            toast(message);
        }
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
        theme = theme === "custom-dark" ? "custom-light" : "custom-dark";
        fireAndForget(chromeStorage.local.set(THEME_KEY, theme), "toggleTheme");
    }

    onMount(() => {
        fireAndForget(loadProviders(), "loadProviders");
        fireAndForget(loadTheme(), "loadTheme");
    });
</script>

<div class="h-screen bg-base-100 p-4 relative flex flex-col overflow-hidden">
    <Toaster
        position="top-center"
        theme={theme === "custom-dark" ? "dark" : "light"}
    />

    <div class="max-w-4xl mx-auto w-full flex flex-col h-full">
        <header class="mb-4">
            <div class="flex justify-between items-start">
                <div>
                    <h1 class="text-xl font-bold text-base-content mb-1">
                        Vegan Mage AI tabs
                    </h1>
                </div>
                <Button onclick={toggleTheme} variant="ghost" size="sm">
                    <span
                        >{theme === "custom-dark" ? "Light" : "Dark"} Mode</span
                    >
                </Button>
            </div>
        </header>

        <Tabs.Root bind:value={activeView} class="flex-1 flex flex-col min-h-0">
            <Tabs.List class="grid w-fit grid-cols-2 mb-4 mx-auto">
                <Tabs.Trigger value="providers">Providers</Tabs.Trigger>
                <Tabs.Trigger value="messaging">Messages</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content
                value="providers"
                class="flex-1 overflow-y-auto min-h-0 p-1 mt-0"
            >
                <ProviderSettings />
            </Tabs.Content>
            <Tabs.Content
                value="messaging"
                class="flex-1 min-h-0 flex flex-col mt-0"
            >
                <MessagingView />
            </Tabs.Content>
        </Tabs.Root>
    </div>
</div>

<script lang="ts">
    import { getContext } from "svelte";
    import { chromeStorage } from "@toocoolname/chrome-proxy";
    import { DEFAULT_PROVIDERS, type AppContext } from "./types";

    const { showStatus, getProviders, setProviders } =
        getContext<AppContext>("app");

    let draggedIndex = $state<number>();

    async function saveProviders() {
        try {
            await chromeStorage.local.set("providerSettings", getProviders());
            showStatus("Settings saved", "success");
        } catch (error) {
            console.error("Error saving providers:", error);
            showStatus("Failed to save settings", "error");
        }
    }

    function handleToggle(index: number, enabled: boolean) {
        const currentProviders = getProviders();
        const enabledCount = currentProviders.filter((p) => p.enabled).length;
        if (!enabled && enabledCount === 1) {
            showStatus("At least one provider must remain enabled", "error");
            return;
        }

        currentProviders[index].enabled = enabled;
        setProviders([...currentProviders]);
    }

    function handleDragStart(index: number) {
        draggedIndex = index;
    }

    function handleDragOver(e: DragEvent, index: number) {
        e.preventDefault();
        if (draggedIndex === undefined || draggedIndex === index) return;

        const currentProviders = [...getProviders()];
        const [removed] = currentProviders.splice(draggedIndex, 1);
        currentProviders.splice(index, 0, removed);
        setProviders(currentProviders);
        draggedIndex = index;
    }

    function handleDragEnd() {
        draggedIndex = undefined;
    }

    function resetToDefault() {
        if (confirm("Reset to default settings?")) {
            const defaults = JSON.parse(JSON.stringify(DEFAULT_PROVIDERS));
            setProviders(defaults);
            chromeStorage.local
                .set("providerSettings", defaults)
                .catch(console.error);
        }
    }
</script>

<div class="rounded-xl border bg-card text-card-foreground shadow">
    <div class="flex flex-col p-6 space-y-1">
        <h3 class="font-semibold leading-none tracking-tight">Providers</h3>
        <p class="text-sm text-muted-foreground">
            Drag to reorder • Toggle to enable
        </p>
    </div>

    <div class="p-6 pt-0 space-y-2">
        {#each getProviders() as provider, index (provider.id)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                draggable="true"
                ondragstart={() => handleDragStart(index)}
                ondragover={(e) => handleDragOver(e, index)}
                ondragend={handleDragEnd}
                class="flex items-center gap-3 p-3 rounded-md border bg-background transition-all cursor-move hover:border-primary/50 {draggedIndex ===
                index
                    ? 'opacity-40'
                    : 'border-border'}"
            >
                <div
                    class="flex items-center justify-center w-6 h-6 text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="lucide lucide-grip-vertical h-4 w-4"
                        ><circle cx="9" cy="12" r="1" /><circle
                            cx="9"
                            cy="5"
                            r="1"
                        /><circle cx="9" cy="19" r="1" /><circle
                            cx="15"
                            cy="12"
                            r="1"
                        /><circle cx="15" cy="5" r="1" /><circle
                            cx="15"
                            cy="19"
                            r="1"
                        /></svg
                    >
                </div>

                <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm truncate">
                        {provider.name}
                    </div>
                    <a
                        href={provider.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-[10px] text-primary hover:underline block truncate"
                        onclick={(e) => e.stopPropagation()}
                    >
                        {provider.url}
                    </a>
                </div>

                <div class="flex items-center space-x-2">
                    <button
                        type="button"
                        role="switch"
                        aria-checked={provider.enabled}
                        aria-label="Toggle {provider.name}"
                        class="peer inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 {provider.enabled
                            ? 'bg-primary'
                            : 'bg-input'}"
                        onclick={() => handleToggle(index, !provider.enabled)}
                    >
                        <span
                            class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {provider.enabled
                                ? 'translate-x-4'
                                : 'translate-x-0'}"
                        ></span>
                    </button>
                </div>
            </div>
        {/each}
    </div>

    <div class="flex items-center p-6 pt-0 justify-end gap-2">
        <button
            onclick={resetToDefault}
            class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
        >
            Reset
        </button>
        <button
            onclick={saveProviders}
            class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
        >
            Save
        </button>
    </div>
</div>

<script lang="ts">
    import { getContext } from "svelte";
    import { chromeStorage } from "@toocoolname/chrome-proxy";
    import { DEFAULT_PROVIDERS, type AppContext } from "./types";
    import * as Card from "$lib/components/ui/card";
    import { Switch } from "$lib/components/ui/switch";
    import { Button } from "$lib/components/ui/button";
    import { GripVertical } from "lucide-svelte";

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

<Card.Root>
    <Card.Header>
        <Card.Title>Providers</Card.Title>
        <Card.Description>Drag to reorder • Toggle to enable</Card.Description>
    </Card.Header>

    <Card.Content class="space-y-2">
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
                    <GripVertical class="h-4 w-4" />
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

                <div
                    class="flex items-center space-x-2"
                    onmousedown={(e) => e.stopPropagation()}
                >
                    <Switch
                        checked={provider.enabled}
                        onCheckedChange={(v: boolean) => handleToggle(index, v)}
                        aria-label="Toggle {provider.name}"
                    />
                </div>
            </div>
        {/each}
    </Card.Content>

    <Card.Footer class="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="ghost" onclick={resetToDefault}>Reset</Button>
        <Button onclick={saveProviders}>Save</Button>
    </Card.Footer>
</Card.Root>

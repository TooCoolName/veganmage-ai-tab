import { mount } from 'svelte';
import App from '@veganmage-ai-tab/ui/components/sidepanel/App.svelte';
import { createSidepanelServices } from '@veganmage-ai-tab/ui/components/sidepanel/shared';

const container = document.getElementById('root');
if (container) {
    const services = createSidepanelServices('real');
    mount(App, {
        target: container,
        props: { services }
    });
} else {
    throw new Error('Root container not found');
}

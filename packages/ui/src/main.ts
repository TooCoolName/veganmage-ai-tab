import { mount } from 'svelte';
import App from './components/sidepanel/App.svelte';
import { createSidepanelServices } from './components/sidepanel/shared';
import '@veganmage-ai-tab/shadui/lib/global.css';

const container = document.getElementById('root');
if (container) {
    const services = createSidepanelServices('mock');
    mount(App, {
        target: container,
        props: { services }
    });
} else {
    throw new Error('Root container not found');
}

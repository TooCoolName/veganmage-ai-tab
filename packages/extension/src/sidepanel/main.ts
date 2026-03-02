import { mount } from 'svelte';
import { App } from '@veganmage-ai-tab/ui/components/index';
import '@veganmage-ai-tab/ui/global.css';

const container = document.getElementById('root');
if (container) {
    mount(App, { target: container });
} else {
    throw new Error('Root container not found');
}

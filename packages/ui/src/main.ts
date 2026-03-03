import { mount } from 'svelte';
import App from './components/sidepanel/App.svelte';
import '@veganmage-ai-tab/shadui/lib/global.css';

const container = document.getElementById('root');
if (container) {
    mount(App, { target: container });
} else {
    throw new Error('Root container not found');
}

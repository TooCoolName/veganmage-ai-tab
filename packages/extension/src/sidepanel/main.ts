import { mount } from 'svelte';
import { App } from '@veganmage/ui';
import '@veganmage/ui/sidepanel.css';

const container = document.getElementById('root');
if (container) {
    mount(App, { target: container });
} else {
    throw new Error('Root container not found');
}

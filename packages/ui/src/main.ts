import { mount } from 'svelte';
import App from './lib/components/sidepanel/App.svelte';
import './lib/sidepanel.css';

const container = document.getElementById('root');
if (container) {
    mount(App, { target: container });
} else {
    throw new Error('Root container not found');
}

import { mount } from 'svelte';
import App from './App.svelte';

const container = document.getElementById('root');
if (container) {
    mount(App, { target: container });
} else {
    throw new Error('Root container not found');
}

import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    plugins: [
        tailwindcss(),
        svelte()
    ],
    resolve: {
        alias: {
            '@veganmage-ai-tab/shadui': path.resolve(__dirname, './src')
        }
    }
});

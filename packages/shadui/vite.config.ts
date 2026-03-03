import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [
        tailwindcss(),
        svelte(),
        tsconfigPaths()
    ],
    resolve: {
        alias: {
            '@veganmage-ai-tab/shadui': path.resolve(__dirname, './src')
        }
    }
});

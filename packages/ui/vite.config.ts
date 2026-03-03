import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        tailwindcss(),
        svelte(),
        tsconfigPaths()
    ],
    resolve: {
        alias: {
            '@veganmage-ai-tab/ui': path.resolve(__dirname, './src')
        }
    },
    server: {
        port: 5173
    }
});

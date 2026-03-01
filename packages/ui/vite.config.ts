import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        tailwindcss(),
        svelte()
    ],
    resolve: {
        alias: {
            '$lib': path.resolve(__dirname, './src/lib'),
            '$schema': path.resolve(__dirname, './src/schema')
        }
    },
    server: {
        port: 5173
    }
});

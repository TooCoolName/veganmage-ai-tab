import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [
        tailwindcss(),
        svelte(),
        tsconfigPaths()
    ],
    server: {
        fs: {
            // Required: Allows Vite to serve files from outside this folder (the other packages)
            allow: ['..'],
        },
        port: 5173
    }
});

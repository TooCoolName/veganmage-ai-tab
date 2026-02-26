import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    base: './',
    plugins: [
        tailwindcss(),
        svelte({
            preprocess: [sveltePreprocess({ cache: true })]
        })
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '$lib': path.resolve(__dirname, './src/lib'),
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: false, // Don't wipe dist because Bun builds background/content scripts there
        rollupOptions: {
            input: {
                sidepanel: path.resolve(__dirname, 'sidepanel.html'),
            },
            output: {
                entryFileNames: `[name].js`,
                chunkFileNames: `[name].js`,
                assetFileNames: `[name].[ext]`
            }
        },
    },
});

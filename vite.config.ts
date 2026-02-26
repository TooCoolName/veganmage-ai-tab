import { defineConfig } from 'vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
    plugins: [svelte({
        preprocess: [vitePreprocess()]
    })],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: false, // Don't wipe dist because Bun builds background/content scripts there
        rollupOptions: {
            input: {
                sidepanel: path.resolve(__dirname, 'public/sidepanel.html'),
            },
            output: {
                entryFileNames: `[name].js`,
                chunkFileNames: `[name].js`,
                assetFileNames: `[name].[ext]`
            }
        },
    },
});

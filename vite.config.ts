import { defineConfig } from 'vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const isWatch = process.env.VITE_WATCH === 'true' || process.argv.includes('--watch');

export default defineConfig({
    base: './',
    plugins: [
        tailwindcss(),
        svelte({
            preprocess: [vitePreprocess()]
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
        minify: isWatch ? false : 'esbuild',
        cssMinify: !isWatch,
        sourcemap: false, // Disable sourcemaps even in watch mode to speed up build
        rollupOptions: {
            input: {
                sidepanel: path.resolve(__dirname, 'sidepanel.html'),
            },
            treeshake: !isWatch, // Disable treeshaking in watch mode for speed
            output: {
                entryFileNames: `[name].js`,
                chunkFileNames: `[name].js`,
                assetFileNames: `[name].[ext]`,
                manualChunks(id: string) {
                    if (id.includes('node_modules')) {
                        return 'vendor';
                    }
                }
            }
        },
    },
});

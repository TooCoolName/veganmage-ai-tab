import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    srcDir: 'src',
    modules: ['@wxt-dev/module-svelte'],
    manifest: {
        name: 'Vegan Mage AI tab',
        version: '1.1',
        description: 'Extension of Vegan Mage for enhanced workflows automating LLM providers chat exchange.',
        permissions: ['tabs', 'storage', 'sidePanel'],
        host_permissions: [
            "*://chatgpt.com/*",
            "*://chat.openai.com/*",
            "*://claude.ai/*",
            "*://gemini.google.com/*",
            "*://grok.com/*",
            "*://chat.deepseek.com/*",
            "*://chat.groq.com/*"
        ],
        action: {
            default_title: "Vegan Mage AI tab"
        },
        externally_connectable: {
            ids: ["*"]
        }
    },
    vite: () => ({
        plugins: [
            // Tailwind is handled by the svelte module if configured, 
            // but we can also add the vite plugin here.
            // However, @wxt-dev/module-svelte handles svelte files.
        ],
        resolve: {
            alias: {
                '@': '/src',
                '$lib': '/src/lib',
            },
        },
    })
});

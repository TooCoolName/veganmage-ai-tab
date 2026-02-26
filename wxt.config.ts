import { defineConfig } from 'wxt';

import tailwindcss from '@tailwindcss/vite';

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
        },
        icons: {
            "16": "images/icon16.png",
            "48": "images/icon48.png",
            "128": "images/icon128.png"
        }
    },
    vite: () => ({
        plugins: [
            tailwindcss(),
        ],
        resolve: {
            alias: {
                '@': '/src',
                '$lib': '/src/lib',
            },
        },
    })
});

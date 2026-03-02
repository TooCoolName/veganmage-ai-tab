import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import ts from "typescript-eslint";
import svelteParser from "svelte-eslint-parser";
import globals from "globals";

export default ts.config(
    js.configs.recommended,
    ...ts.configs.recommended,
    ...svelte.configs["flat/recommended"],
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                chrome: "readonly",
            },
        },
    },
    {
        files: ["**/*.svelte"],
        languageOptions: {
            parser: svelteParser,
            parserOptions: {
                parser: ts.parser,
            },
        },
    },
    {
        ignores: [
            "**/node_modules/**",
            "**/.wxt/**",
            "**/.output/**",
            "**/dist/**",
            "**/.turbo/**"
        ],
    }
);

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';
import eslintPluginSvelte from 'eslint-plugin-svelte';
import svelteEslintParser from 'svelte-eslint-parser';

export const globalIgnores = {
    ignores: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.output/**',
        '**/.wxt/**',
        '**/coverage/**',
        '*.min.js',
        '.svelte-kit'
    ]
}

export const baseConfig = [
    globalIgnores,
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...eslintPluginSvelte.configs['flat/recommended'],
    {
        linterOptions: {
            noInlineConfig: true,
        },
        plugins: {
            'import-x': importX,
        },
    },
    {
        files: ['**/*.{ts,svelte}'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                projectService: {
                    allowDefaultProject: [
                        'eslint.config.js',
                        'eslint.base.mjs',
                    ],
                    defaultProject: 'tsconfig.json',
                },
                extraFileExtensions: ['.svelte'],
            },
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.serviceworker,
                chrome: 'readonly',
            },
        },
    },
    {
        files: ['**/*.svelte'],
        languageOptions: {
            parser: svelteEslintParser,
            parserOptions: {
                parser: tseslint.parser,
            },
        },
    },
    {
        files: ['**/*.{ts,svelte}'],
        settings: {
            'import-x/resolver': {
                typescript: true,
            },
        },
        rules: {
            "prefer-promise-reject-errors": "error",
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/prefer-nullish-coalescing': 'error',
            '@typescript-eslint/prefer-optional-chain': 'error',
            '@typescript-eslint/no-unsafe-return': 'error',
            "@typescript-eslint/only-throw-error": "error",
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            'no-void': 'error',
            'no-restricted-globals': ['error', 'chrome'],
            '@typescript-eslint/consistent-type-assertions': [
                'error',
                {
                    assertionStyle: 'never',
                },
            ],
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['../*'],
                            message: 'Relative parent imports are not allowed. Please use aliases (e.g., @/...) instead.',
                        },
                    ],
                },
            ],
            "@typescript-eslint/typedef": [
                "error",
                {
                    "parameter": true,
                    "arrowParameter": false,
                    "variableDeclaration": false,
                    "memberVariableDeclaration": false
                }
            ],
        },
    },
    {
        files: ['**/*.{js,mjs,cjs}'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        files: ['**/*.test.ts'],
        rules: {
            '@typescript-eslint/consistent-type-assertions': 'off',
        },
    }
];

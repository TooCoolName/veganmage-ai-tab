import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';

export default tseslint.config(
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/coverage/**',
            '*.min.js',
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
            'import-x': importX,
        },
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['*.ts'],
                },
                tsconfigRootDir: import.meta.dirname,
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.serviceworker,
                chrome: 'readonly',
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
            'import-x/resolver': {
                typescript: true,
            },
        },
        rules: {
            ...reactPlugin.configs.recommended.rules,
            ...reactHooksPlugin.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/prefer-nullish-coalescing': 'error',
            '@typescript-eslint/prefer-optional-chain': 'error',
            '@typescript-eslint/no-unsafe-return': 'error',
            '@typescript-eslint/consistent-type-assertions': [
                'error',
                {
                    assertionStyle: 'never',
                },
            ],
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'Literal[value=null]',
                    message: 'Use undefined instead of null',
                },
                {
                    selector: 'TSNullKeyword',
                    message: 'Use undefined instead of null',
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
        },
    },

    {
        files: ['**/*.{js,mjs,cjs}'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    }
);

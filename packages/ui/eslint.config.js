import { baseConfig } from '../../eslint.base.mjs';

export default [
    ...baseConfig,
    {
        files: ['src/**/*.{ts,svelte}'],
        rules: {
            '@typescript-eslint/consistent-type-assertions': 'off',
        },
    }
];

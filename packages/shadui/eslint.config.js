import { baseConfig } from '../../eslint.base.mjs';

export default [
    ...baseConfig,
    {
        files: ['src/lib/components/ui/**/*.svelte'],
        rules: {
            '@typescript-eslint/consistent-type-assertions': 'off',
            '@typescript-eslint/prefer-nullish-coalescing': 'off'
        },
    }
];

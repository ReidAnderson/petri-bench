import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'node',
        include: ['tests/**/*.spec.ts'],
        exclude: ['tests/e2e/**'],
        globals: false,
        dir: '.',
        css: false,
        environmentOptions: {},
        setupFiles: [],
        coverage: { enabled: false },
        typecheck: {
            tsconfig: 'tsconfig.test.json'
        }
    },
});

import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
    base: command === 'build' ? '/petri-bench/' : '/',
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@/components': path.resolve(__dirname, './src/components'),
            '@/hooks': path.resolve(__dirname, './src/hooks'),
            '@/utils': path.resolve(__dirname, './src/utils'),
            '@/types': path.resolve(__dirname, './src/types'),
            '@/pages': path.resolve(__dirname, './src/pages'),
        },
    },
    server: {
        port: 3000,
        open: true,
        strictPort: true,
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/setupTests.ts'],
        exclude: ['**/node_modules/**', '**/tests/**'],
    },
}))

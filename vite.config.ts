import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const isPages = !!process.env.GITHUB_PAGES;
    return {
        base: isPages ? '/petri-bench/' : '/',
        plugins: [react()],
        server: {
            port: 5173,
            open: true,
        },
        preview: {
            port: 4173,
        },
    };
});

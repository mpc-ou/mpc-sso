import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const BACKEND_URL = process.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

export default defineConfig({
  base: '/admin/ui/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        'oidc-login': resolve(__dirname, 'oidc-login.html'),
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/node_modules/react-router')) return 'vendor-router';
          if (id.includes('/node_modules/@tanstack/react-query')) return 'vendor-query';
          if (id.includes('/node_modules/@base-ui/react')) return 'vendor-base-ui';
          if (/\/node_modules\/(react|react-dom)\//.test(id)) return 'vendor-react';
          return 'vendor';
        },
      },
    },
  },
  server: {
    proxy: {
      '/admin': BACKEND_URL,
      '/api': BACKEND_URL,
      '/.well-known': BACKEND_URL,
      '/authorize': BACKEND_URL,
      '/login': BACKEND_URL,
      '/token': BACKEND_URL,
    },
  },
});

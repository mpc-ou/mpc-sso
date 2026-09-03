import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const BACKEND_URL = process.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

const rootPackageJson = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8'),
) as { version: string };

export default defineConfig({
  base: '/admin/ui/',
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(rootPackageJson.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
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
        profile: resolve(__dirname, 'profile.html'),
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
      '/profile': BACKEND_URL,
      '/connect': BACKEND_URL,
    },
  },
});

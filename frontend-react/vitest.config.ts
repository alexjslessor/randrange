import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      enabled: true,
      include: ['src/**/*.{ts,tsx,jsx}']
    },
  },
  define: {
    VITE_PREFECT_API_URL: JSON.stringify(process.env.VITE_PREFECT_API_URL),
    VITE_AUTH_USER: JSON.stringify(process.env.VITE_AUTH_USER),
  },
});

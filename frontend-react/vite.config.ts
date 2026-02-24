import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    open: false, // disables browser auto-open
    host: true,  // enables access from Docker host via localhost
    port: 4000, //  sets internal port to 4000
    watch: {
      usePolling: true, // use polling if host FS doesn't notify changes (e.g., Mac/Windows)
    },

  },
  define: {
    VITE_PREFECT_API_URL: JSON.stringify(process.env.VITE_PREFECT_API_URL),
    VITE_AUTH_USER: JSON.stringify(process.env.VITE_AUTH_USER),
  }
});

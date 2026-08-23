import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Local dev: bypass Telegram auth and use SUPER_ADMIN mock session
    'import.meta.env.VITE_LOCAL_DEV': JSON.stringify('true'),
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'https://olmaliq.online',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});

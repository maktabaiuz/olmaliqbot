import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Foydalanuvchi ilovasi https://olmaliq.online/app/ ostida ishlaydi.
export default defineConfig({
  base: '/app/',
  plugins: [react()],
  server: { proxy: { '/api': 'https://olmaliq.online' } },
});

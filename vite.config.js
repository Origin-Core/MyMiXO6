import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Actions supplies --base=/MyMiXO6/ for GitHub Pages builds.
  base: '/',
  server: { port: 5173 },
});

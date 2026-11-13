import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' : le site fonctionne aussi bien sur GitHub Pages (sous-dossier)
// que sur Netlify / Vercel (racine). Le routage utilise HashRouter.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
  },
});

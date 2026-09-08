import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Un solo paquete de 1,6 MB obligaba a bajarlo entero para ver la
      // primera pantalla, y cualquier cambio en el código de la app
      // invalidaba también las librerías. Separadas, el navegador se guarda
      // React, Tone y compañía entre despliegue y despliegue.
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return;
            // Tone arrastra standardized-audio-context y automation-events:
            // si quedan en 'vendor' se bajan en la primera pantalla aunque no
            // haya sonado nada.
            if (id.includes('/tone/') || id.includes('standardized-audio-context')
                || id.includes('automation-events') || id.includes('/rxjs')) return 'tone';
            if (id.includes('@tonejs/midi') || id.includes('midi-file')) return 'midi';
            if (id.includes('react-markdown') || id.includes('/remark') || id.includes('/mdast') || id.includes('/micromark') || id.includes('/hast')) return 'markdown';
            if (id.includes('/motion') || id.includes('framer-motion')) return 'motion';
            if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) return 'react';
            if (id.includes('lucide-react')) return 'icons';
            return 'vendor';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

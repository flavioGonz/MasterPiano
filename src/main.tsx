import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {watchSystemTheme} from './lib/theme';
import {watchInstallPrompt} from './lib/pwa';
import './index.css';

// El tema ya quedó aplicado por el script inline de index.html; acá solo
// seguimos al sistema en vivo mientras el usuario no haya elegido uno.
watchSystemTheme();
// Escuchar temprano: el navegador dispara beforeinstallprompt una sola vez.
watchInstallPrompt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

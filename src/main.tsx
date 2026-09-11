import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { AppErrorBoundary } from './components/layout/ErrorBoundary';
import './styles.css';
import './styles/tokens.css';
import './styles/mobile.css';
import './styles/workout.css';
import './styles/screens.css';

registerSW({
  immediate: true,
  onRegisteredSW: (_scriptUrl, registration) => {
    void registration?.update();
    window.addEventListener('focus', () => void registration?.update());
  },
  onOfflineReady: () => window.dispatchEvent(new Event('coach-offline-ready')),
});

if ('serviceWorker' in navigator) {
  let refreshing = false;
  const applyUpdate = () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Une mise à jour ne doit jamais recharger l'application en pleine séance :
    // l'utilisateur peut être au milieu d'une série, téléphone en main.
    if (document.documentElement.dataset.coachBusy === 'true') {
      window.dispatchEvent(new Event('coach-update-pending'));
      return;
    }
    applyUpdate();
  });

  window.addEventListener('coach-apply-update', applyUpdate);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

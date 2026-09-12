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
import './styles/ui.css';

registerSW({
  immediate: true,
  onRegisteredSW: (_scriptUrl, registration) => {
    void registration?.update();
    window.addEventListener('focus', () => void registration?.update());

    // Toute nouvelle version installée devient visible dans l'application, même
    // hors séance : sinon rien ne signale qu'une version plus récente attend.
    registration?.addEventListener('updatefound', () => {
      const installing = registration.installing;
      installing?.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          window.dispatchEvent(new Event('coach-update-pending'));
        }
      });
    });
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

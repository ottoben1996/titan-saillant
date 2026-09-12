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
import './styles/followup.css';

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

  /**
   * Mise à jour déterministe : on désenregistre le service worker, on vide les
   * caches puis on recharge avec un paramètre qui force une requête réseau.
   *
   * Nécessaire parce que le cycle de mise à jour d'un service worker (fetch du
   * sw.js, installation, activation, rechargement) dépend de règles de cache et
   * de temporisation du navigateur : quand il se bloque, recharger l'application
   * ne suffit pas et seule une remise à zéro du cache fait avancer la version.
   * Les données de séance vivent dans IndexedDB : elles ne sont pas touchées.
   */
  const forceUpdate = async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } finally {
      const url = new URL(window.location.href);
      url.searchParams.set('maj', Date.now().toString());
      window.location.replace(url.toString());
    }
  };

  window.addEventListener('coach-force-update', () => void forceUpdate());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

import { registerSW } from 'virtual:pwa-register';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './components/layout/ErrorBoundary';
import { surveillerLaFluidite } from './perf/fluidite';
import './styles.css';
import './styles/tokens.css';
import './styles/mobile.css';
import './styles/workout.css';
import './styles/quick-log.css';
import './styles/screens.css';
import './styles/ui.css';
import './styles/followup.css';
// En dernier : la couche matière et mouvement décide à spécificité égale.
import './styles/matiere.css';

registerSW({
  immediate: true,
  /**
   * Sans cette option, Workbox recharge la page LUI-MÊME dès qu'une nouvelle
   * version prend la main, sans condition : le garde-fou `coachBusy` posé plus
   * bas n'était jamais atteint, et une mise à jour tombant pendant une séance
   * rechargeait l'application en pleine série — le chrono repartait d'une valeur
   * restaurée, ce qui se lit « le chrono bug après une mise à jour ».
   */
  onNeedReload: () => {
    if (document.documentElement.dataset.coachBusy === 'true') {
      window.dispatchEvent(new Event('coach-update-pending'));
      return;
    }
    window.location.reload();
  },
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

/**
 * La couche « matière » (flou des barres, respiration du squelette) coûte une
 * repainte par image. On l'adapte à ce que l'appareil peut réellement peindre au
 * lieu de le supposer : la décision est mesurée au démarrage, et refaite au
 * retour au premier plan. Voir src/perf/fluidite.ts.
 */
surveillerLaFluidite();

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

/**
 * L'espace MUSTAPHA n'est chargé que si on l'ouvre : son code ne part plus dans
 * le paquet initial de l'application Ottman, pour toutes les personnes, à
 * chaque ouverture.
 *
 * Le test passe par `BASE_URL` : écrit en dur, « /mustapha » ne correspondait
 * qu'en développement, où la base vaut « / ». En ligne, la base est
 * « /titan-saillant/ » et le second produit n'était donc jamais monté — sans
 * que rien ne le signale, puisque tout fonctionnait en local.
 */
const MustaphaApp = lazy(() => import('./mustapha/MustaphaApp'));

const estEspaceMustapha = window.location.pathname.startsWith(`${import.meta.env.BASE_URL}mustapha`);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      {estEspaceMustapha ? (
        <Suspense fallback={<div className="app-shell" aria-busy="true" />}>
          <MustaphaApp />
        </Suspense>
      ) : (
        <App />
      )}
    </AppErrorBoundary>
  </StrictMode>,
);
